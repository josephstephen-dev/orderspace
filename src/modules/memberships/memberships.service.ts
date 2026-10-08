import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import type { ActingMember } from '../../common/interfaces/acting-member.interface';
import { pageArgs, toPage } from '../../common/utils/pagination.util';
import { outranks } from '../../common/utils/role.util';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { MembershipRole, NotificationType } from '../../generated/prisma/enums';
import { NotificationsService } from '../notifications/notifications.service';
import { QueryMembersDto, UpdateMemberRoleDto } from './dto';
import { MembershipEntity } from './entities';

const USER_SELECT = { id: true, name: true, email: true, avatarUrl: true } as const;

export interface AdminRecipient {
    id: string;
    name: string;
    email: string;
}

@Injectable()
export class MembershipsService {
    private readonly logger = new Logger(MembershipsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) {}

    async findAll(organizationId: string, query: QueryMembersDto) {
        const { role, search } = query;
        const where: Prisma.MembershipWhereInput = {
            organizationId,
            role,
            user: search
                ? {
                      OR: [
                          { name: { contains: search, mode: 'insensitive' } },
                          { email: { contains: search, mode: 'insensitive' } },
                      ],
                  }
                : undefined,
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.membership.findMany({
                where,
                include: { user: { select: USER_SELECT } },
                // Enum order is OWNER, ADMIN, MEMBER, VIEWER.
                orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
                ...pageArgs(query),
            }),
            this.prisma.membership.count({ where }),
        ]);

        return toPage(
            items.map((item) => new MembershipEntity(item)),
            total,
            query,
        );
    }

    async updateRole(
        organizationId: string,
        targetUserId: string,
        actor: ActingMember,
        dto: UpdateMemberRoleDto,
    ) {
        const target = await this.findMembership(organizationId, targetUserId);

        if (target.userId === actor.userId) {
            throw new BadRequestException('You cannot change your own role');
        }
        if (target.role === MembershipRole.OWNER) {
            throw new ForbiddenException(
                'Ownership can only move through the transfer endpoint',
            );
        }
        if (!outranks(actor.role, target.role)) {
            throw new ForbiddenException(
                'You can only manage members whose role is below yours',
            );
        }
        if (!outranks(actor.role, dto.role)) {
            throw new ForbiddenException('You can only assign roles below your own');
        }

        const updated = await this.prisma.membership.update({
            where: {
                userId_organizationId: { userId: targetUserId, organizationId },
            },
            data: { role: dto.role },
            include: { user: { select: USER_SELECT } },
        });
        return new MembershipEntity(updated);
    }

    async removeMember(
        organizationId: string,
        targetUserId: string,
        actor: ActingMember,
    ): Promise<void> {
        const target = await this.findMembership(organizationId, targetUserId);

        if (target.userId === actor.userId) {
            throw new BadRequestException('Use the leave endpoint to remove yourself');
        }
        if (target.role === MembershipRole.OWNER) {
            throw new ForbiddenException('The organization owner cannot be removed');
        }
        if (!outranks(actor.role, target.role)) {
            throw new ForbiddenException(
                'You can only remove members whose role is below yours',
            );
        }

        await this.prisma.membership.delete({
            where: {
                userId_organizationId: { userId: targetUserId, organizationId },
            },
        });

        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { name: true },
        });
        this.notificationsService
            .createAndEmit(targetUserId, {
                type: NotificationType.MEMBER_REMOVED,
                title: 'You were removed from an organization',
                body: organization
                    ? `You no longer have access to ${organization.name}.`
                    : undefined,
                resourceType: 'Organization',
                resourceId: organizationId,
                meta: { organizationId },
            })
            .catch((error: unknown) =>
                this.logger.warn(`Removal notice failed: ${String(error)}`),
            );
    }

    async leave(organizationId: string, userId: string): Promise<void> {
        const membership = await this.findMembership(organizationId, userId);
        if (membership.role === MembershipRole.OWNER) {
            throw new ForbiddenException('Transfer ownership before leaving');
        }
        await this.prisma.membership.delete({
            where: { userId_organizationId: { userId, organizationId } },
        });
    }

    /**
     * Owners and admins of each organization, for alerts. Inactive and deleted
     * accounts are skipped.
     */
    async findAdminRecipients(
        organizationIds: string[],
    ): Promise<Map<string, AdminRecipient[]>> {
        const recipients = new Map<string, AdminRecipient[]>();
        if (organizationIds.length === 0) return recipients;

        const rows = await this.prisma.membership.findMany({
            where: {
                organizationId: { in: organizationIds },
                role: { in: [MembershipRole.OWNER, MembershipRole.ADMIN] },
                user: { isActive: true, deletedAt: null },
            },
            select: {
                organizationId: true,
                user: { select: { id: true, name: true, email: true } },
            },
        });

        for (const row of rows) {
            const list = recipients.get(row.organizationId) ?? [];
            list.push(row.user);
            recipients.set(row.organizationId, list);
        }
        return recipients;
    }

    private async findMembership(organizationId: string, userId: string) {
        const membership = await this.prisma.membership.findUnique({
            where: { userId_organizationId: { userId, organizationId } },
            select: { userId: true, role: true },
        });
        if (!membership) throw new NotFoundException('Membership not found');
        return membership;
    }
}