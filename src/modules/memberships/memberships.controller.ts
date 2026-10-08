import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiOrgAccess,
    ApiPageResponse,
    AuditLog,
    CurrentMembership,
    CurrentUser,
    OrgId,
    Roles,
} from '../../common/decorators';
import { OrgMemberGuard, RolesGuard } from '../../common/guards';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import type { RequestMembership } from '../../common/interfaces/authenticated-request.interface';
import { toActingMember } from '../../common/utils/role.util';
import { AuditAction, MembershipRole } from '../../generated/prisma/enums';
import { QueryMembersDto, UpdateMemberRoleDto } from './dto';
import { MembershipEntity } from './entities';
import { MembershipsService } from './memberships.service';

@ApiTags('Members')
@ApiOrgAccess()
@Controller('organizations/:orgId/members')
@UseGuards(OrgMemberGuard, RolesGuard)
export class MembershipsController {
    constructor(private readonly membershipsService: MembershipsService) {}

    @Get()
    @Roles(MembershipRole.MEMBER)
    @ApiOperation({ summary: 'List members' })
    @ApiPageResponse(MembershipEntity)
    findAll(@OrgId() organizationId: string, @Query() query: QueryMembersDto) {
        return this.membershipsService.findAll(organizationId, query);
    }

    // Declared before ":userId" so that "me" is never read as a user ID.
    @Delete('me')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(MembershipRole.VIEWER)
    @AuditLog({
        entity: 'Membership',
        action: AuditAction.LEAVE,
        actorIsEntity: true,
    })
    @ApiOperation({ summary: 'Leave the organization' })
    @ApiNoContentResponse({ description: 'You left the organization' })
    async leave(
        @OrgId() organizationId: string,
        @CurrentUser('sub') userId: string,
    ) {
        await this.membershipsService.leave(organizationId, userId);
    }

    @Patch(':userId')
    @Roles(MembershipRole.ADMIN)
    @AuditLog({ entity: 'Membership', idParam: 'userId' })
    @ApiOperation({
        summary: "Change a member's role",
        description:
            'You can only change members below your own role, and only to roles below your own.',
    })
    @ApiParam({ name: 'userId', description: 'The member to change' })
    @ApiOkResponse({ type: MembershipEntity })
    @ApiNotFoundResponse({ description: 'Membership not found' })
    updateRole(
        @OrgId() organizationId: string,
        @Param('userId', ParseUUIDPipe) targetUserId: string,
        @CurrentUser() user: JwtPayload,
        @CurrentMembership() membership: RequestMembership | undefined,
        @Body() dto: UpdateMemberRoleDto,
    ) {
        return this.membershipsService.updateRole(
            organizationId,
            targetUserId,
            toActingMember(user, membership),
            dto,
        );
    }

    @Delete(':userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(MembershipRole.ADMIN)
    @AuditLog({ entity: 'Membership', idParam: 'userId' })
    @ApiOperation({ summary: 'Remove a member' })
    @ApiParam({ name: 'userId', description: 'The member to remove' })
    @ApiNoContentResponse({ description: 'Member removed' })
    @ApiNotFoundResponse({ description: 'Membership not found' })
    async removeMember(
        @OrgId() organizationId: string,
        @Param('userId', ParseUUIDPipe) targetUserId: string,
        @CurrentUser() user: JwtPayload,
        @CurrentMembership() membership: RequestMembership | undefined,
    ) {
        await this.membershipsService.removeMember(
            organizationId,
            targetUserId,
            toActingMember(user, membership),
        );
    }
}