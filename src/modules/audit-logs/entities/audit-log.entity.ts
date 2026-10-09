import { ApiProperty } from '@nestjs/swagger';
import type { Prisma } from '../../../generated/prisma/client';
import { AuditAction } from '../../../generated/prisma/enums';

export class AuditLogActorEntity {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Ada Okafor' }) name: string;
    @ApiProperty({ example: 'ada@example.com' }) email: string;
}

export interface AuditLogSourceRecord {
    id: string;
    organizationId: string | null;
    actorId: string | null;
    action: AuditAction;
    entity: string;
    entityId: string | null;
    before: Prisma.JsonValue | null;
    after: Prisma.JsonValue | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    actor?: { id: string; name: string; email: string } | null;
}

export class AuditLogEntity {
    @ApiProperty() id: string;
    @ApiProperty({ type: String, nullable: true }) organizationId:
        string | null;
    @ApiProperty({ type: String, nullable: true }) actorId: string | null;
    @ApiProperty({ enum: AuditAction }) action: AuditAction;
    @ApiProperty({ example: 'Product' }) entity: string;
    @ApiProperty({ type: String, nullable: true }) entityId: string | null;
    @ApiProperty({ type: Object, nullable: true })
    before: Prisma.JsonValue | null;
    @ApiProperty({ type: Object, nullable: true })
    after: Prisma.JsonValue | null;
    @ApiProperty({ type: String, nullable: true }) ipAddress: string | null;
    @ApiProperty({ type: String, nullable: true }) userAgent: string | null;
    @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
    @ApiProperty({ type: AuditLogActorEntity, nullable: true })
    actor: AuditLogActorEntity | null;

    constructor(source: AuditLogSourceRecord) {
        this.id = source.id;
        this.organizationId = source.organizationId;
        this.actorId = source.actorId;
        this.action = source.action;
        this.entity = source.entity;
        this.entityId = source.entityId;
        this.before = source.before;
        this.after = source.after;
        this.ipAddress = source.ipAddress;
        this.userAgent = source.userAgent;
        this.createdAt = source.createdAt;
        this.actor = source.actor
            ? {
                  id: source.actor.id,
                  name: source.actor.name,
                  email: source.actor.email,
              }
            : null;
    }
}

export class AuditLogPageEntity {
    @ApiProperty({ type: [AuditLogEntity] }) items: AuditLogEntity[];
    @ApiProperty({ example: 42 }) total: number;
    @ApiProperty({ example: 1 }) page: number;
    @ApiProperty({ example: 20 }) limit: number;
}
