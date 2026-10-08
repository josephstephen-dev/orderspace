import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { runJob } from './job-runner';

const DAY_MS = 24 * 60 * 60 * 1000;
const REVOKED_RETENTION_DAYS = 30;
const OTP_RETENTION_DAYS = 1;

/**
 * Daily at 02:00 UTC: removes expired refresh tokens and spent one-time codes.
 * A revoked token is kept until it would have expired anyway, because replaying
 * a rotated token is how stolen sessions are detected.
 */
@Injectable()
export class TokenCleanupService {
    private readonly logger = new Logger(TokenCleanupService.name);

    constructor(private readonly prisma: PrismaService) {}

    @Cron(CronExpression.EVERY_DAY_AT_2AM, { name: 'token-cleanup', timeZone: 'UTC' })
    handle(): Promise<void> {
        return runJob(this.logger, 'Token cleanup', async () => {
            const now = Date.now();
            const otpCutoff = new Date(now - OTP_RETENTION_DAYS * DAY_MS);

            const [tokens, codes] = await Promise.all([
                this.prisma.refreshToken.deleteMany({
                    where: {
                        OR: [
                            { expiresAt: { lt: new Date(now) } },
                            {
                                revokedAt: {
                                    lt: new Date(now - REVOKED_RETENTION_DAYS * DAY_MS),
                                },
                            },
                        ],
                    },
                }),
                this.prisma.otpCode.deleteMany({
                    where: {
                        OR: [
                            { expiresAt: { lt: otpCutoff } },
                            { usedAt: { lt: otpCutoff } },
                        ],
                    },
                }),
            ]);
            return `${tokens.count} refresh token(s), ${codes.count} one-time code(s) removed`;
        });
    }
}