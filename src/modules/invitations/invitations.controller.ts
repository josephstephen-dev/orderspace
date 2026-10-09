import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
    ApiAuth,
    ApiOrgAccess,
    ApiPageResponse,
    AuditLog,
    CurrentMembership,
    CurrentUser,
    OrgId,
    Public,
    Roles,
} from '../../common/decorators';
import { OrgMemberGuard, RolesGuard } from '../../common/guards';
import type { RequestMembership } from '../../common/interfaces/authenticated-request.interface';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { toActingMember } from '../../common/utils/role.util';
import { AuditAction, MembershipRole } from '../../generated/prisma/enums';
import { CreateInvitationDto, QueryInvitationsDto } from './dto';
import { InvitationEntity, InvitationPreviewEntity } from './entities';
import { InvitationsService } from './invitations.service';

@ApiTags('Invitations')
@ApiOrgAccess()
@Controller('organizations/:orgId/invitations')
@UseGuards(OrgMemberGuard, RolesGuard)
@Roles(MembershipRole.ADMIN)
export class OrgInvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Post()
    @AuditLog({ entity: 'Invitation', action: AuditAction.INVITE })
    @ApiOperation({
        summary: 'Invite someone by email',
        description:
            'Sends a single-use token that expires after 7 days. You can only invite to roles below your own.',
    })
    @ApiCreatedResponse({ type: InvitationEntity })
    @ApiConflictResponse({
        description: 'Already a member, or already invited',
    })
    send(
        @OrgId() organizationId: string,
        @CurrentUser() user: JwtPayload,
        @CurrentMembership() membership: RequestMembership | undefined,
        @Body() dto: CreateInvitationDto,
    ) {
        return this.invitationsService.send(
            organizationId,
            toActingMember(user, membership),
            dto,
        );
    }

    @Get()
    @ApiOperation({ summary: 'List invitations' })
    @ApiPageResponse(InvitationEntity)
    findAll(
        @OrgId() organizationId: string,
        @Query() query: QueryInvitationsDto,
    ) {
        return this.invitationsService.findAll(organizationId, query);
    }

    @Post(':id/resend')
    @HttpCode(HttpStatus.OK)
    @AuditLog({ entity: 'Invitation', action: AuditAction.INVITE })
    @ApiOperation({
        summary: 'Re-send an invitation',
        description:
            'Issues a new token and expiry, and invalidates the previous token.',
    })
    @ApiParam({ name: 'id', description: 'Invitation ID' })
    @ApiOkResponse({ type: InvitationEntity })
    @ApiBadRequestResponse({
        description: 'Invitation is not pending or expired',
    })
    resend(
        @OrgId() organizationId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: JwtPayload,
        @CurrentMembership() membership: RequestMembership | undefined,
    ) {
        return this.invitationsService.resend(
            organizationId,
            id,
            toActingMember(user, membership),
        );
    }

    @Delete(':id')
    @AuditLog({ entity: 'Invitation', action: AuditAction.STATUS_CHANGE })
    @ApiOperation({ summary: 'Revoke a pending invitation' })
    @ApiParam({ name: 'id', description: 'Invitation ID' })
    @ApiOkResponse({ type: InvitationEntity })
    @ApiBadRequestResponse({ description: 'Invitation is not pending' })
    @ApiNotFoundResponse({ description: 'Invitation not found' })
    revoke(
        @OrgId() organizationId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.invitationsService.revoke(organizationId, id);
    }
}

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Get(':token')
    @Public()
    @Throttle({ default: { ttl: 60_000, limit: 20 } })
    @ApiOperation({
        summary: 'Look up an invitation by token',
        description:
            'Public. Shows the organization, role and expiry so the invitee can decide.',
    })
    @ApiParam({
        name: 'token',
        description: 'The token from the invitation email',
    })
    @ApiOkResponse({ type: InvitationPreviewEntity })
    @ApiNotFoundResponse({ description: 'Invitation not found' })
    preview(@Param('token') token: string) {
        return this.invitationsService.preview(token);
    }

    @Post(':token/accept')
    @HttpCode(HttpStatus.OK)
    @AuditLog({ entity: 'Invitation', action: AuditAction.JOIN })
    @ApiAuth()
    @ApiOperation({
        summary: 'Accept an invitation',
        description:
            'You must be signed in with the email address the invitation was sent to.',
    })
    @ApiParam({ name: 'token' })
    @ApiOkResponse({ type: InvitationEntity })
    @ApiConflictResponse({ description: 'Already a member' })
    accept(@Param('token') token: string, @CurrentUser() user: JwtPayload) {
        return this.invitationsService.accept(token, user);
    }

    @Post(':token/decline')
    @HttpCode(HttpStatus.OK)
    @AuditLog({ entity: 'Invitation', action: AuditAction.STATUS_CHANGE })
    @ApiAuth()
    @ApiOperation({ summary: 'Decline an invitation' })
    @ApiParam({ name: 'token' })
    @ApiOkResponse({ type: InvitationEntity })
    decline(@Param('token') token: string, @CurrentUser() user: JwtPayload) {
        return this.invitationsService.decline(token, user);
    }
}
