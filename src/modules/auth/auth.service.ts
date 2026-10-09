import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import {
    OTP_EXPIRY_MINUTES,
    OTP_MAX_ATTEMPTS,
    generateSecureOtp,
    getOtpExpiryDate,
    hashOtp,
    verifyOtp,
} from '../../common/utils/otp.util';
import { generateSecureToken, hmacToken } from '../../common/utils/token.util';
import { JwtConfig, durationToMs } from '../../config';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { GlobalRole, OtpPurpose } from '../../generated/prisma/enums';
import { EmailService } from '../email/email.service';
import { EmailTemplate } from '../email/email.types';
import {
    ChangePasswordDto,
    ForgotPasswordDto,
    LoginDto,
    RefreshTokenDto,
    RegisterDto,
    ResendOtpDto,
    ResetPasswordDto,
    UpdateProfileDto,
    VerifyEmailDto,
} from './dto';
import { UserEntity } from './entities';

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 48;
const OTP_RESEND_COOLDOWN_MS = 60_000;
const INVALID_CODE = 'Invalid or expired code';

interface SessionUser {
    id: string;
    email: string;
    globalRole: GlobalRole;
}

interface SessionTokens {
    accessToken: string;
    refreshToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly jwtConfig: JwtConfig;
    private readonly accessExpiresInSeconds: number;
    /** Compared against when an email is unknown, so login timing does not reveal accounts. */
    private readonly timingGuardHash: Promise<string>;

    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly emailService: EmailService,
    ) {
        this.jwtConfig = this.configService.getOrThrow<JwtConfig>('jwt');
        this.accessExpiresInSeconds = Math.floor(
            durationToMs(this.jwtConfig.accessExpiresIn) / 1000,
        );
        this.timingGuardHash = bcrypt.hash(
            generateSecureToken(16),
            BCRYPT_ROUNDS,
        );
    }

    // ── Registration and verification ─────────────────────────────────────

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                name: dto.name,
                password: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
            },
        });

        await this.issueOtp(user, OtpPurpose.EMAIL_VERIFICATION);
        this.logger.log(`User registered: ${this.maskEmail(user.email)}`);

        return {
            message:
                'Registration successful. Check your email for the verification code. If it does not arrive, request a new one.',
            user: new UserEntity(user),
        };
    }

    async verifyEmail(dto: VerifyEmailDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || user.deletedAt || user.emailVerified) {
            throw new BadRequestException(INVALID_CODE);
        }

        await this.consumeOtp(user.id, dto.code, OtpPurpose.EMAIL_VERIFICATION);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
        });

        this.logger.log(`Email verified: ${this.maskEmail(user.email)}`);
        return { message: 'Email verified. You can now log in.' };
    }

    async resendVerificationOtp(dto: ResendOtpDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (user && !user.deletedAt && !user.emailVerified) {
            await this.issueOtp(user, OtpPurpose.EMAIL_VERIFICATION);
        }
        // The same answer either way, so emails cannot be enumerated.
        return {
            message:
                'If this email is registered and not yet verified, a new code is on its way.',
        };
    }

    // ── Sessions ──────────────────────────────────────────────────────────

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        // Always run bcrypt, and check the password before revealing account state.
        const passwordValid = await bcrypt.compare(
            dto.password,
            user?.password ?? (await this.timingGuardHash),
        );
        if (!user || user.deletedAt || !passwordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new ForbiddenException('Account is deactivated');
        }
        if (!user.emailVerified) {
            throw new ForbiddenException(
                'Email not verified. Verify your email before logging in.',
            );
        }

        const refresh = await this.createRefreshToken(this.prisma, user.id);
        const [tokens, seen] = await Promise.all([
            this.signSession(user, refresh.token),
            this.prisma.user.update({
                where: { id: user.id },
                data: { lastSeenAt: new Date() },
            }),
        ]);

        this.logger.log(`User logged in: ${this.maskEmail(user.email)}`);
        return { ...tokens, user: new UserEntity(seen) };
    }

    async refresh(dto: RefreshTokenDto) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { tokenHash: this.hashRefreshToken(dto.refreshToken) },
            include: { user: true },
        });
        if (!stored) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        if (stored.revokedAt) {
            // A token that was already rotated is being replayed: assume it leaked.
            if (stored.replacedById) {
                await this.revokeAllSessions(stored.userId);
                this.logger.warn(
                    `Refresh token reuse detected, sessions revoked for user ${stored.userId}`,
                );
            }
            throw new UnauthorizedException('Refresh token has been revoked');
        }
        if (stored.expiresAt <= new Date()) {
            throw new UnauthorizedException('Refresh token has expired');
        }

        const { user } = stored;
        if (user.deletedAt) {
            throw new UnauthorizedException('Invalid refresh token');
        }
        if (!user.isActive) {
            throw new ForbiddenException('Account is deactivated');
        }

        const next = await this.prisma.$transaction(async (tx) => {
            // Claim the old token. If a parallel request already did, count is 0.
            const claimed = await tx.refreshToken.updateMany({
                where: { id: stored.id, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            if (claimed.count !== 1) {
                throw new UnauthorizedException(
                    'Refresh token has been revoked',
                );
            }
            const created = await this.createRefreshToken(tx, user.id);
            await tx.refreshToken.update({
                where: { id: stored.id },
                data: { replacedById: created.id },
            });
            return created;
        });

        const tokens = await this.signSession(user, next.token);
        return { ...tokens, user: new UserEntity(user) };
    }

    async logout(userId: string, dto: RefreshTokenDto): Promise<void> {
        // Scoped to the caller, so one user cannot revoke another's session.
        await this.prisma.refreshToken.updateMany({
            where: {
                userId,
                tokenHash: this.hashRefreshToken(dto.refreshToken),
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });
    }

    // ── Profile and password ──────────────────────────────────────────────

    async getMe(userId: string) {
        return new UserEntity(await this.findActiveUser(userId));
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        await this.findActiveUser(userId);
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: { name: dto.name, avatarUrl: dto.avatarUrl },
        });
        return new UserEntity(user);
    }

    async changePassword(
        userId: string,
        dto: ChangePasswordDto,
    ): Promise<void> {
        const user = await this.findActiveUser(userId);

        if (!(await bcrypt.compare(dto.currentPassword, user.password))) {
            throw new BadRequestException('Current password is incorrect');
        }
        if (dto.currentPassword === dto.newPassword) {
            throw new BadRequestException(
                'The new password must be different from the current one',
            );
        }

        await this.replacePassword(userId, dto.newPassword);
    }

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (user && !user.deletedAt && user.isActive) {
            await this.issueOtp(user, OtpPurpose.PASSWORD_RESET);
        }
        return {
            message:
                'If this email is registered, a password reset code is on its way.',
        };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user || user.deletedAt || !user.isActive) {
            throw new BadRequestException(INVALID_CODE);
        }

        await this.consumeOtp(user.id, dto.code, OtpPurpose.PASSWORD_RESET);
        await this.replacePassword(user.id, dto.newPassword);

        this.logger.log(`Password reset: ${this.maskEmail(user.email)}`);
        return { message: 'Password has been reset. Log in with the new one.' };
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private async findActiveUser(userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null, isActive: true },
        });
        if (!user) {
            throw new UnauthorizedException('Account is not available');
        }
        return user;
    }

    private async replacePassword(userId: string, newPassword: string) {
        const password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: userId },
                data: { password },
            }),
            this.prisma.refreshToken.updateMany({
                where: { userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
    }

    private revokeAllSessions(userId: string) {
        return this.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    private hashRefreshToken(token: string): string {
        return hmacToken(token, this.jwtConfig.refreshSecret);
    }

    private async createRefreshToken(
        client: Prisma.TransactionClient,
        userId: string,
    ) {
        const token = generateSecureToken(REFRESH_TOKEN_BYTES);
        const record = await client.refreshToken.create({
            data: {
                userId,
                tokenHash: this.hashRefreshToken(token),
                expiresAt: new Date(
                    Date.now() + this.jwtConfig.refreshExpiresInMs,
                ),
            },
            select: { id: true },
        });
        return { id: record.id, token };
    }

    private async signSession(
        user: SessionUser,
        refreshToken: string,
    ): Promise<SessionTokens> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            globalRole: user.globalRole,
        };
        return {
            accessToken: await this.jwtService.signAsync(payload),
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: this.accessExpiresInSeconds,
        };
    }

    private maskEmail(email: string): string {
        return email.replace(/^(.{1,2})[^@]*/, '$1***');
    }

    // ── One-time codes ────────────────────────────────────────────────────

    /** Creates a code and emails it. Silently skipped inside the cooldown window. */
    private async issueOtp(
        user: { id: string; email: string; name: string },
        purpose: OtpPurpose,
    ): Promise<void> {
        const latest = await this.prisma.otpCode.findFirst({
            where: { userId: user.id, purpose },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
        });
        if (
            latest &&
            Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
        ) {
            return;
        }

        const code = generateSecureOtp();
        const codeHash = await hashOtp(code);

        await this.prisma.$transaction([
            this.prisma.otpCode.updateMany({
                where: { userId: user.id, purpose, usedAt: null },
                data: { usedAt: new Date() },
            }),
            this.prisma.otpCode.create({
                data: {
                    userId: user.id,
                    purpose,
                    codeHash,
                    expiresAt: getOtpExpiryDate(),
                },
            }),
        ]);

        const template =
            purpose === OtpPurpose.EMAIL_VERIFICATION
                ? EmailTemplate.EMAIL_VERIFICATION
                : EmailTemplate.PASSWORD_RESET_OTP;

        // Not awaited: a slow mail provider must not slow or fail the request.
        this.emailService
            .send(template, {
                to: user.email,
                name: user.name,
                code,
                expiresInMinutes: OTP_EXPIRY_MINUTES,
            })
            .catch((error: unknown) => {
                this.logger.error(
                    `Could not send ${purpose} email to ${this.maskEmail(user.email)}`,
                    String(error),
                );
            });
    }

    /** Checks a code and marks it used. Throws if it is wrong, expired or spent. */
    private async consumeOtp(
        userId: string,
        code: string,
        purpose: OtpPurpose,
    ): Promise<void> {
        const record = await this.prisma.otpCode.findFirst({
            where: {
                userId,
                purpose,
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!record) {
            throw new BadRequestException(INVALID_CODE);
        }

        // Count the attempt before comparing, so parallel guesses cannot beat the limit.
        const { attempts } = await this.prisma.otpCode.update({
            where: { id: record.id },
            data: { attempts: { increment: 1 } },
            select: { attempts: true },
        });
        if (attempts > OTP_MAX_ATTEMPTS) {
            await this.prisma.otpCode.update({
                where: { id: record.id },
                data: { usedAt: new Date() },
            });
            throw new BadRequestException(
                'Too many failed attempts. Request a new code.',
            );
        }

        if (!(await verifyOtp(code, record.codeHash))) {
            throw new BadRequestException(INVALID_CODE);
        }

        // Only one request can spend the code.
        const spent = await this.prisma.otpCode.updateMany({
            where: { id: record.id, usedAt: null },
            data: { usedAt: new Date() },
        });
        if (spent.count !== 1) {
            throw new BadRequestException(INVALID_CODE);
        }
    }
}
