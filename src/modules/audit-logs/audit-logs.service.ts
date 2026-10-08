import { BadRequestException, Injectable } from '@nestjs/common';
import { pageArgs, toPage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { QueryAuditLogsDto } from './dto';
import { AuditLogEntity } from './entities';

const ACTOR_SELECT = { id: true, name: true, email: true } as const;

@Injectable()
export class AuditLogsService {
    constructor(private readonly prisma: PrismaService) {}

    /**
     * Read-only. Entries are written by AuditLogInterceptor, so no code path
     * can edit or delete them.
     */
    async findAll(organizationId: string, query: QueryAuditLogsDto) {
        const { actorId, action, entity, entityId, from, to, sort } = query;

        if (from && to && new Date(from) > new Date(to)) {
            throw new BadRequestException('"from" must not be later than "to"');
        }

        const createdAt: Prisma.DateTimeFilter = {};
        if (from) createdAt.gte = new Date(from);
        if (to) createdAt.lte = new Date(to);

        // Undefined filters are ignored by Prisma.
        const where: Prisma.AuditLogWhereInput = {
            organizationId,
            actorId,
            action,
            entity,
            entityId,
            createdAt: from || to ? createdAt : undefined,
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.auditLog.findMany({
                where,
                include: { actor: { select: ACTOR_SELECT } },
                orderBy: [{ createdAt: sort }, { id: sort }],
                ...pageArgs(query),
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        return toPage(
            items.map((item) => new AuditLogEntity(item)),
            total,
            query,
        );
    }
}