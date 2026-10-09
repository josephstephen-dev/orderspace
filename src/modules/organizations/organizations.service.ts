import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import type { PaginationQueryDto } from '../../common/dto';
import { pageArgs, toPage } from '../../common/utils/pagination.util';
import { isUniqueViolation } from '../../common/utils/prisma-error.util';
import { MAX_SLUG_LENGTH, slugify } from '../../common/utils/slug.util';
import { PrismaService } from '../../database/prisma.service';
import { InvitationStatus, MembershipRole } from '../../generated/prisma/enums';
import {
    CreateOrganizationDto,
    TransferOwnershipDto,
    UpdateOrganizationDto,
} from './dto';
import {
    MyOrganizationEntity,
    OrganizationDetailEntity,
    OrganizationEntity,
} from './entities';

const DEFAULT_CURRENCY = 'USD';
const SLUG_TAKEN = 'That slug is already taken';

@Injectable()
export class OrganizationsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, dto: CreateOrganizationDto) {
        const slug = dto.slug ?? (await this.generateSlug(dto.name));
        if (dto.slug && (await this.slugExists(slug))) {
            throw new ConflictException(SLUG_TAKEN);
        }

        try {
            const organization = await this.prisma.$transaction(async (tx) => {
                const created = await tx.organization.create({
                    data: {
                        name: dto.name,
                        slug,
                        description: dto.description,
                        logoUrl: dto.logoUrl,
                        website: dto.website,
                        currency: dto.currency ?? DEFAULT_CURRENCY,
                        ownerId: userId,
                    },
                });
                await tx.membership.create({
                    data: {
                        userId,
                        organizationId: created.id,
                        role: MembershipRole.OWNER,
                    },
                });
                return created;
            });

            return new MyOrganizationEntity(organization, {
                role: MembershipRole.OWNER,
                joinedAt: organization.createdAt,
            });
        } catch (error) {
            // Lost a race for the same slug.
            if (isUniqueViolation(error))
                throw new ConflictException(SLUG_TAKEN);
            throw error;
        }
    }

    async findAllForUser(userId: string, query: PaginationQueryDto) {
        const where = { userId, organization: { deletedAt: null } };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.membership.findMany({
                where,
                include: { organization: true },
                orderBy: [{ joinedAt: 'asc' }, { organizationId: 'asc' }],
                ...pageArgs(query),
            }),
            this.prisma.membership.count({ where }),
        ]);

        return toPage(
            items.map(
                (item) =>
                    new MyOrganizationEntity(item.organization, {
                        role: item.role,
                        joinedAt: item.joinedAt,
                    }),
            ),
            total,
            query,
        );
    }

    async findOne(organizationId: string, userId: string) {
        const organization = await this.prisma.organization.findFirst({
            where: { id: organizationId, deletedAt: null },
            include: {
                _count: { select: { memberships: true } },
                memberships: {
                    where: { userId },
                    select: { role: true, joinedAt: true },
                },
            },
        });
        if (!organization)
            throw new NotFoundException('Organization not found');

        return new OrganizationDetailEntity(
            organization,
            organization.memberships[0] ?? null,
            organization._count.memberships,
        );
    }

    async update(organizationId: string, dto: UpdateOrganizationDto) {
        const organization = await this.requireActive(organizationId);

        if (dto.currency && dto.currency !== organization.currency) {
            const orders = await this.prisma.order.count({
                where: { organizationId },
            });
            if (orders > 0) {
                throw new ConflictException(
                    'The currency cannot change once the organization has orders',
                );
            }
        }

        const updated = await this.prisma.organization.update({
            where: { id: organizationId },
            data: {
                // A null from the client clears optional fields but never a required one.
                name: dto.name ?? undefined,
                currency: dto.currency ?? undefined,
                description: dto.description,
                logoUrl: dto.logoUrl,
                website: dto.website,
            },
        });
        return new OrganizationEntity(updated);
    }

    async softDelete(organizationId: string, userId: string): Promise<void> {
        const organization = await this.requireActive(organizationId);
        if (organization.ownerId !== userId) {
            throw new ForbiddenException(
                'Only the owner can delete the organization',
            );
        }

        await this.prisma.$transaction([
            this.prisma.organization.update({
                where: { id: organizationId },
                data: { deletedAt: new Date() },
            }),
            // Nobody should be able to join something that no longer exists.
            this.prisma.invitation.updateMany({
                where: { organizationId, status: InvitationStatus.PENDING },
                data: { status: InvitationStatus.REVOKED },
            }),
        ]);
    }

    /**
     * Deleted organizations are invisible to the access guards, so this route
     * checks ownership itself. Anyone else gets a plain "not found".
     */
    async restore(organizationId: string, userId: string) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization || organization.ownerId !== userId) {
            throw new NotFoundException('Organization not found');
        }
        if (!organization.deletedAt) {
            throw new BadRequestException('This organization is not deleted');
        }

        const restored = await this.prisma.organization.update({
            where: { id: organizationId },
            data: { deletedAt: null },
        });
        return new OrganizationEntity(restored);
    }

    async transferOwnership(
        organizationId: string,
        currentOwnerId: string,
        dto: TransferOwnershipDto,
    ) {
        const organization = await this.requireActive(organizationId);
        if (organization.ownerId !== currentOwnerId) {
            throw new ForbiddenException(
                'Only the owner can transfer ownership',
            );
        }
        if (dto.newOwnerId === currentOwnerId) {
            throw new BadRequestException('You are already the owner');
        }

        const successor = await this.prisma.membership.findFirst({
            where: {
                organizationId,
                userId: dto.newOwnerId,
                user: { isActive: true, deletedAt: null },
            },
            select: { userId: true },
        });
        if (!successor) {
            throw new BadRequestException(
                'The new owner must be an active member of this organization',
            );
        }

        await this.prisma.$transaction(async (tx) => {
            // The condition makes sure ownership did not move in the meantime.
            const moved = await tx.organization.updateMany({
                where: {
                    id: organizationId,
                    ownerId: currentOwnerId,
                    deletedAt: null,
                },
                data: { ownerId: dto.newOwnerId },
            });
            if (moved.count !== 1) {
                throw new ConflictException(
                    'Ownership changed while this request was processed',
                );
            }
            await tx.membership.update({
                where: {
                    userId_organizationId: {
                        userId: dto.newOwnerId,
                        organizationId,
                    },
                },
                data: { role: MembershipRole.OWNER },
            });
            await tx.membership.update({
                where: {
                    userId_organizationId: {
                        userId: currentOwnerId,
                        organizationId,
                    },
                },
                data: { role: MembershipRole.ADMIN },
            });
        });

        return new OrganizationEntity(
            await this.prisma.organization.findUniqueOrThrow({
                where: { id: organizationId },
            }),
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private async requireActive(organizationId: string) {
        const organization = await this.prisma.organization.findFirst({
            where: { id: organizationId, deletedAt: null },
        });
        if (!organization)
            throw new NotFoundException('Organization not found');
        return organization;
    }

    /** Slugs of deleted organizations stay reserved, so a restore can never collide. */
    private async slugExists(slug: string): Promise<boolean> {
        return (await this.prisma.organization.count({ where: { slug } })) > 0;
    }

    private async generateSlug(name: string): Promise<string> {
        const base = slugify(name) || 'organization';
        const similar = await this.prisma.organization.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
        });
        const taken = new Set(similar.map((organization) => organization.slug));
        if (!taken.has(base)) return base;

        for (let suffix = 2; ; suffix += 1) {
            const tail = `-${suffix}`;
            const candidate = `${base.slice(0, MAX_SLUG_LENGTH - tail.length)}${tail}`;
            if (!taken.has(candidate)) return candidate;
        }
    }
}
