import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import type { ActingMember } from '../../common/interfaces/acting-member.interface';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { pageArgs, toPage } from '../../common/utils/pagination.util';
import { outranks } from '../../common/utils/role.util';
import { generateSecureToken, hashToken } from '../../common/utils/token.util';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import {
    InvitationStatus,
    MembershipRole,
    NotificationType,
} from '../../generated/prisma/enums';
import { EmailService } from '../email/email.service';
import { EmailPayloadMap, EmailTemplate } from '../email/email.types';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateInvitationDto, QueryInvitationsDto } from './dto';
import { InvitationEntity, InvitationPreviewEntity } from './entities';

const INVITATION_TTL_DAYS = 7;
const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,128}$/;

const INCLUDE = {
    organization: {
        select: { id: true, name: true, slug: true, deletedAt: true },
    },
    sentBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class InvitationsService {
    private readonly logger = new Logger(InvitationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
        private readonly notificationsService: NotificationsService,
        private readonly membershipsService: MembershipsService,
    ) {}

    // ── Organization side (ADMIN and above) ───────────────────────────────

    async send(organizationId: string, actor: ActingMember, dto: CreateInvitationDto) {
        const role = dto.role ?? MembershipRole.MEMBER;
        if (!outranks(actor.role, role)) {
            throw new ForbiddenException(
                'You can only invite people to roles below your own',
            );
        }

        const [organization, inviter, member, pending] = await Promise.all([
            this.prisma.organization.findFirst({
                where: { id: organizationId, deletedAt: null },
                select: { name: true },
            }),
            this.prisma.user.findUnique({
                where: { id: actor.userId },
                select: { name: true },
            }),
            this.prisma.membership.findFirst({
                where: { organizationId, user: { email: dto.email } },
                select: { userId: true },
            }),
            this.prisma.invitation.findFirst({
                where: {
                    organizationId,
                    email: dto.email,
                    status: InvitationStatus.PENDING,
                    expiresAt: { gt: new Date() },
                },
                select: { id: true },
            }),
        ]);

        if (!organization) throw new NotFoundException('Organization not found');
        if (member) {
            throw new ConflictException('This person is already a member');
        }
        if (pending) {
            throw new ConflictException(
                'A pending invitation already exists for this email. Re-send or revoke it instead.',
            );
        }

        const { token, tokenHash } = this.newToken();
        const invitation = await this.prisma.invitation.create({
            data: {
                organizationId,
                email: dto.email,
                role,
                status: InvitationStatus.PENDING,
                tokenHash,
                expiresAt: this.newExpiry(),
                sentById: actor.userId,
            },
            include: INCLUDE,
        });

        this.deliver({
            to: invitation.email,
            organizationName: organization.name,
            inviterName: inviter?.name ?? 'A teammate',
            role: invitation.role,
            token,
            expiresAt: invitation.expiresAt,
        });
        return new InvitationEntity(invitation);
    }

    async findAll(organizationId: string, query: QueryInvitationsDto) {
        const where: Prisma.InvitationWhereInput = {
            organizationId,
            status: query.status,
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.invitation.findMany({
                where,
                include: INCLUDE,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                ...pageArgs(query),
            }),
            this.prisma.invitation.count({ where }),
        ]);
        return toPage(
            items.map((item) => new InvitationEntity(item)),
            total,
            query,
        );
    }

    /** Issues a fresh token and expiry. The old token stops working. */
    async resend(organizationId: string, id: string, actor: ActingMember) {
        const invitation = await this.findInOrganization(organizationId, id);

        if (
            invitation.status !== InvitationStatus.PENDING &&
            invitation.status !== InvitationStatus.EXPIRED
        ) {
            throw new BadRequestException(
                'Only pending or expired invitations can be re-sent',
            );
        }
        if (!outranks(actor.role, invitation.role)) {
            throw new ForbiddenException(
                'You can only re-send invitations for roles below your own',
            );
        }

        const inviter = await this.prisma.user.findUnique({
            where: { id: actor.userId },
            select: { name: true },
        });
        const { token, tokenHash } = this.newToken();
        const updated = await this.prisma.invitation.update({
            where: { id },
            data: {
                status: InvitationStatus.PENDING,
                tokenHash,
                expiresAt: this.newExpiry(),
                sentById: actor.userId,
            },
            include: INCLUDE,
        });

        this.deliver({
            to: updated.email,
            organizationName: updated.organization.name,
            inviterName: inviter?.name ?? 'A teammate',
            role: updated.role,
            token,
            expiresAt: updated.expiresAt,
        });
        return new InvitationEntity(updated);
    }

    async revoke(organizationId: string, id: string) {
        const { count } = await this.prisma.invitation.updateMany({
            where: { id, organizationId, status: InvitationStatus.PENDING },
            data: { status: InvitationStatus.REVOKED },
        });
        if (count === 0) {
            await this.findInOrganization(organizationId, id);
            throw new BadRequestException('Only pending invitations can be revoked');
        }
        return new InvitationEntity(
            await this.findInOrganization(organizationId, id),
        );
    }

    // ── Invitee side (token) ──────────────────────────────────────────────

    async preview(token: string) {
        return new InvitationPreviewEntity(await this.findByToken(token));
    }

    async accept(token: string, user: JwtPayload) {
        const invitation = await this.findByToken(token);
        this.assertAddressedTo(invitation.email, user);
        this.assertOpen(invitation);

        const existing = await this.prisma.membership.findUnique({
            where: {
                userId_organizationId: {
                    userId: user.sub,
                    organizationId: invitation.organizationId,
                },
            },
            select: { userId: true },
        });
        if (existing) {
            throw new ConflictException('You are already a member of this organization');
        }

        const accepted = await this.prisma.$transaction(async (tx) => {
            // Claim the invitation. A parallel request can only win once.
            const claimed = await tx.invitation.updateMany({
                where: {
                    id: invitation.id,
                    status: InvitationStatus.PENDING,
                    expiresAt: { gt: new Date() },
                },
                data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
            });
            if (claimed.count !== 1) {
                throw new BadRequestException('This invitation is no longer available');
            }
            await tx.membership.create({
                data: {
                    userId: user.sub,
                    organizationId: invitation.organizationId,
                    role: invitation.role,
                    invitedById: invitation.sentById,
                },
            });
            return tx.invitation.findUniqueOrThrow({
                where: { id: invitation.id },
                include: INCLUDE,
            });
        });

        void this.announceJoin(accepted.organizationId, accepted.organization.name, user, accepted.role);
        return new InvitationEntity(accepted);
    }

    async decline(token: string, user: JwtPayload) {
        const invitation = await this.findByToken(token);
        this.assertAddressedTo(invitation.email, user);
        this.assertOpen(invitation);

        const { count } = await this.prisma.invitation.updateMany({
            where: { id: invitation.id, status: InvitationStatus.PENDING },
            data: { status: InvitationStatus.DECLINED },
        });
        if (count !== 1) {
            throw new BadRequestException('This invitation is no longer available');
        }
        return new InvitationEntity(
            await this.prisma.invitation.findUniqueOrThrow({
                where: { id: invitation.id },
                include: INCLUDE,
            }),
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private newToken() {
        const token = generateSecureToken(TOKEN_BYTES);
        return { token, tokenHash: hashToken(token) };
    }

    private newExpiry(): Date {
        return new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    }

    private async findInOrganization(organizationId: string, id: string) {
        const invitation = await this.prisma.invitation.findFirst({
            where: { id, organizationId },
            include: INCLUDE,
        });
        if (!invitation) throw new NotFoundException('Invitation not found');
        return invitation;
    }

    private async findByToken(token: string) {
        if (!TOKEN_PATTERN.test(token)) {
            throw new NotFoundException('Invitation not found');
        }
        const invitation = await this.prisma.invitation.findUnique({
            where: { tokenHash: hashToken(token) },
            include: INCLUDE,
        });
        if (!invitation || invitation.organization.deletedAt) {
            throw new NotFoundException('Invitation not found');
        }
        return invitation;
    }

    /** A leaked token is useless to anyone signed in as someone else. */
    private assertAddressedTo(invitedEmail: string, user: JwtPayload): void {
        if (invitedEmail !== user.email.toLowerCase()) {
            throw new ForbiddenException(
                'This invitation was sent to a different email address',
            );
        }
    }

    private assertOpen(invitation: { status: InvitationStatus; expiresAt: Date }): void {
        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException(
                `This invitation is ${invitation.status.toLowerCase()}`,
            );
        }
        if (invitation.expiresAt <= new Date()) {
            throw new BadRequestException('This invitation has expired');
        }
    }

    private deliver(payload: EmailPayloadMap[EmailTemplate.INVITATION]): void {
        this.emailService
            .trySend(EmailTemplate.INVITATION, payload)
            .catch(() => undefined);
    }

    /** Welcome email and an alert to the organization's admins. Never throws. */
    private async announceJoin(
        organizationId: string,
        organizationName: string,
        user: JwtPayload,
        role: MembershipRole,
    ): Promise<void> {
        try {
            const [profile, recipients] = await Promise.all([
                this.prisma.user.findUnique({
                    where: { id: user.sub },
                    select: { name: true },
                }),
                this.membershipsService.findAdminRecipients([organizationId]),
            ]);
            const name = profile?.name ?? user.email;

            await this.emailService.trySend(EmailTemplate.WELCOME, {
                to: user.email,
                name,
                organizationName,
                role,
            });
            await this.notificationsService.createAndEmitMany(
                (recipients.get(organizationId) ?? [])
                    .map((admin) => admin.id)
                    .filter((id) => id !== user.sub),
                {
                    type: NotificationType.MEMBER_JOINED,
                    title: `${name} joined ${organizationName}`,
                    resourceType: 'Organization',
                    resourceId: organizationId,
                    meta: { organizationId, userId: user.sub, role },
                },
            );
        } catch (error) {
            this.logger.warn(`Join announcement failed: ${String(error)}`);
        }
    }
}