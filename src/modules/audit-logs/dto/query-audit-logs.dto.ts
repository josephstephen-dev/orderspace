import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsIn,
    IsOptional,
    IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';
import { AUDIT_ENTITIES } from '../../../common/decorators/audit-log.decorator';
import { AuditAction } from '../../../generated/prisma/enums';

// Fix TS1272: Explicitly import AuditEntity as a type for isolatedModules
import type { AuditEntity } from '../../../common/decorators/audit-log.decorator';

/** The organization always comes from the URL, never from the query string. */
export class QueryAuditLogsDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Only changes made by this user' })
    @IsOptional()
    @IsUUID()
    actorId?: string;

    @ApiPropertyOptional({ enum: AuditAction })
    @IsOptional()
    @IsEnum(AuditAction)
    action?: AuditAction;

    @ApiPropertyOptional({ enum: AUDIT_ENTITIES, example: 'Order', type: () => String })
    @IsOptional()
    @IsIn(AUDIT_ENTITIES)
    entity?: AuditEntity;

    @ApiPropertyOptional({ description: 'Only changes to this record' })
    @IsOptional()
    @IsUUID()
    entityId?: string;

    @ApiPropertyOptional({ example: '2026-10-01T00:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ example: '2026-10-31T23:59:59.999Z' })
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    sort: 'asc' | 'desc' = 'desc';
}
