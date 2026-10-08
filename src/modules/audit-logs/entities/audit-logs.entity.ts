import { ApiProperty } from '@nestjs/swagger';
import { AUDIT_ENTITIES } from '../../../common/decorators/audit-log.decorator';
import type { Page } from '../../../common/utils/pagination.util';
import { AuditAction } from '../../../generated/prisma/enums';

export class AuditActorEntity {
    @ApiProperty({ example: 'b6f1c0de-2f0e-4c61-9a52-3d1f6a2c9e10' })
    id: string;

    @ApiProperty({ example: 'Ada Okafor' })
    name: string;

    @ApiProperty({ example: 'ada@example.com' })
    email: string;
}

export class AuditLogEntity {
    @ApiProperty({ example: '0b8a6c44-6b9d-4b9f-9a77-1d5f3d1f0a21' })
    id: string;

    @ApiProperty({ type: String, nullable: true })
    actorId: string | null;

    @ApiProperty({ type: String, nullable: true })
    organizationId: string | null;

    @ApiProperty({ enum: AuditAction, example: AuditAction.STATUS_CHANGE })
    action: AuditAction;

    @ApiProperty({ enum: AUDIT_ENTITIES, example: 'Order' })
    entity: string;

    @ApiProperty({ description: 'ID of the record that changed' })
    entityId: string;

    @ApiProperty({
        type: Object,
        nullable: true,
        description: 'Snapshot before the change, with secrets redacted',
    })
    before: unknown;

    @ApiProperty({
        type: Object,
        nullable: true,
        description: 'Snapshot after the change, with secrets redacted',
    })
    after: unknown;

    @ApiProperty({ type: String, nullable: true, example: '203.0.113.7' })
    ipAddress: string | null;

    @ApiProperty({ type: String, nullable: true })
    userAgent: string | null;

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ type: AuditActorEntity, nullable: true })
    actor?: AuditActorEntity | null;

    constructor(partial: Partial<AuditLogEntity>) {
        Object.assign(this, partial);
    }
}

export class AuditLogPageEntity implements Page<AuditLogEntity> {
    @ApiProperty({ type: [AuditLogEntity] })
    items: AuditLogEntity[];

    @ApiProperty({ example: 150 })
    total: number;

    @ApiProperty({ example: 1 })
    page: number;

    @ApiProperty({ example: 25 })
    limit: number;

    @ApiProperty({ example: 6 })
    totalPages: number;

    @ApiProperty({ example: true })
    hasNextPage: boolean;
}