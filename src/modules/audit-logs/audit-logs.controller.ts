import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { ApiOrgAccess, OrgId, Roles } from '../../common/decorators';
import { OrgMemberGuard, RolesGuard } from '../../common/guards';
import { MembershipRole } from '../../generated/prisma/enums';
import { AuditLogsService } from './audit-logs.service';
import { QueryAuditLogsDto } from './dto';
import { AuditLogPageEntity } from './entities';

@ApiTags('Audit Log')
@ApiOrgAccess()
@Controller('organizations/:orgId/audit-logs')
@UseGuards(OrgMemberGuard, RolesGuard)
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) {}

    @Get()
    @Roles(MembershipRole.ADMIN)
    @ApiOperation({
        summary: 'Query the audit trail',
        description:
            'Immutable record of who changed what, with before and after snapshots. ADMIN or higher.',
    })
    @ApiParam({ name: 'orgId', description: 'Organization ID' })
    @ApiOkResponse({ type: AuditLogPageEntity })
    findAll(
        @OrgId() organizationId: string,
        @Query() query: QueryAuditLogsDto,
    ) {
        return this.auditLogsService.findAll(organizationId, query);
    }
}
