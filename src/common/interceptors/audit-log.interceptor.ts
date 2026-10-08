import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, Observable, switchMap, tap } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { AuditAction } from '../../generated/prisma/enums';
import {
    AUDIT_LOG_KEY,
    AuditEntity,
    AuditLogOptions,
} from '../decorators/audit-log.decorator';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/** Action implied by the HTTP method when @AuditLog() gives none. */
const METHOD_ACTION: Partial<Record<string, AuditAction>> = {
    POST: AuditAction.CREATE,
    PUT: AuditAction.UPDATE,
    PATCH: AuditAction.UPDATE,
    DELETE: AuditAction.DELETE,
};

/** Actions that change an existing record, so a "before" snapshot is useful. */
const ACTIONS_WITH_BEFORE: ReadonlySet<AuditAction> = new Set<AuditAction>([
    AuditAction.UPDATE,
    AuditAction.DELETE,
    AuditAction.RESTORE,
    AuditAction.ARCHIVE,
    AuditAction.STATUS_CHANGE,
]);

type SnapshotLoader = (
    prisma: PrismaService,
    id: string,
    organizationId: string | null,
) => Promise<unknown>;

const inOrganization = (organizationId: string | null) =>
    organizationId ? { organizationId } : {};

/**
 * How to read a record before it changes. Entities without a loader (new
 * records, append-only tables) simply get no "before" snapshot.
 */
const SNAPSHOT_LOADERS: Partial<Record<AuditEntity, SnapshotLoader>> = {
    Organization: (prisma, id) =>
        prisma.organization.findUnique({ where: { id } }),
    // For memberships the route parameter is the member's user ID.
    Membership: (prisma, userId, organizationId) =>
        organizationId
            ? prisma.membership.findUnique({
                  where: {
                      userId_organizationId: { userId, organizationId },
                  },
              })
            : Promise.resolve(null),
    Invitation: (prisma, id, orgId) =>
        prisma.invitation.findFirst({ where: { id, ...inOrganization(orgId) } }),
    Category: (prisma, id, orgId) =>
        prisma.category.findFirst({ where: { id, ...inOrganization(orgId) } }),
    Product: (prisma, id, orgId) =>
        prisma.product.findFirst({ where: { id, ...inOrganization(orgId) } }),
    Customer: (prisma, id, orgId) =>
        prisma.customer.findFirst({ where: { id, ...inOrganization(orgId) } }),
    Order: (prisma, id, orgId) =>
        prisma.order.findFirst({ where: { id, ...inOrganization(orgId) } }),
    Attachment: (prisma, id) =>
        prisma.attachment.findUnique({ where: { id } }),
};

/** Field names whose values must never be written to the audit log. */
const SENSITIVE_KEY = /password|secret|token|hash/i;

function redact(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, inner]) => [
                key,
                SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(inner),
            ]),
        );
    }
    return value;
}

/**
 * Converts a record into plain JSON (Decimal and Date become strings) and
 * strips sensitive fields, so it is safe to store in a Json column.
 */
function toSnapshot(value: unknown): Prisma.InputJsonObject | undefined {
    if (!value || typeof value !== 'object') return undefined;
    try {
        const plain: unknown = JSON.parse(
            JSON.stringify(value, (_key, inner: unknown) =>
                typeof inner === 'bigint' ? inner.toString() : inner,
            ),
        );
        return redact(plain) as Prisma.InputJsonObject;
    } catch {
        return undefined;
    }
}

/** Finds the record in a handler result, wrapped in { data } or not. */
function unwrapRecord(response: unknown): Record<string, unknown> | undefined {
    if (!response || typeof response !== 'object') return undefined;
    const record = response as Record<string, unknown>;
    if (typeof record.id === 'string') return record;
    const inner = record.data;
    if (
        inner &&
        typeof inner === 'object' &&
        typeof (inner as Record<string, unknown>).id === 'string'
    ) {
        return inner as Record<string, unknown>;
    }
    return undefined;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditLogInterceptor.name);

    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const options = this.reflector.get<AuditLogOptions | undefined>(
            AUDIT_LOG_KEY,
            context.getHandler(),
        );
        if (!options) return next.handle();

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const action =
            options.action ?? METHOD_ACTION[request.method.toUpperCase()];
        if (!action) return next.handle();

        const actorId = request.user?.sub ?? null;
        const organizationId =
            request.organizationId ?? this.readParam(request, 'orgId');
        const paramEntityId = this.resolveEntityId(request, options, actorId);
        const ipAddress = request.ip ?? null;
        const userAgent = request.headers['user-agent'] ?? null;

        const before =
            ACTIONS_WITH_BEFORE.has(action) && paramEntityId
                ? this.loadBefore(options.entity, paramEntityId, organizationId)
                : Promise.resolve(undefined);

        return from(before).pipe(
            switchMap((beforeSnapshot) =>
                next.handle().pipe(
                    tap((response) => {
                        const record = unwrapRecord(response);
                        const entityId =
                            paramEntityId ??
                            (typeof record?.id === 'string' ? record.id : null);
                        if (!entityId) return;

                        this.write({
                            actorId,
                            // Creating an organization has no org context yet.
                            organizationId:
                                organizationId ??
                                (typeof record?.organizationId === 'string'
                                    ? record.organizationId
                                    : null) ??
                                (options.entity === 'Organization'
                                    ? entityId
                                    : null),
                            action,
                            entity: options.entity,
                            entityId,
                            before: beforeSnapshot,
                            after: toSnapshot(record),
                            ipAddress,
                            userAgent,
                        });
                    }),
                ),
            ),
        );
    }

    private readParam(request: AuthenticatedRequest, name: string) {
        const value = request.params[name];
        return typeof value === 'string' ? value : null;
    }

    private resolveEntityId(
        request: AuthenticatedRequest,
        options: AuditLogOptions,
        actorId: string | null,
    ): string | null {
        if (options.actorIsEntity) return actorId;
        const value = request.params[options.idParam ?? 'id'];
        return typeof value === 'string' ? value : null;
    }

    private async loadBefore(
        entity: AuditEntity,
        id: string,
        organizationId: string | null,
    ): Promise<Prisma.InputJsonObject | undefined> {
        const loader = SNAPSHOT_LOADERS[entity];
        if (!loader) return undefined;
        try {
            return toSnapshot(await loader(this.prisma, id, organizationId));
        } catch {
            this.logger.warn(`Could not load the "before" snapshot for ${entity}`);
            return undefined;
        }
    }

    /** Fire-and-forget: a logging failure must never fail the request. */
    private write(entry: {
        actorId: string | null;
        organizationId: string | null;
        action: AuditAction;
        entity: AuditEntity;
        entityId: string;
        before?: Prisma.InputJsonObject;
        after?: Prisma.InputJsonObject;
        ipAddress: string | null;
        userAgent: string | null;
    }): void {
        this.prisma.auditLog
            .create({ data: entry })
            .catch((error: unknown) => {
                this.logger.error('Failed to write audit log', String(error));
            });
    }
}