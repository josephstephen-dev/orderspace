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
    Post,
    Query,
} from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import {
    ApiAuth,
    ApiPageResponse,
    AuditLog,
    CurrentUser,
    OrgAccess,
} from '../../common/decorators';
import { PaginationQueryDto } from '../../common/dto';
import { AuditAction, MembershipRole } from '../../generated/prisma/enums';
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
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiAuth()
@Controller('organizations')
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) {}

    @Post()
    @AuditLog({ entity: 'Organization' })
    @ApiOperation({
        summary: 'Create an organization',
        description:
            'You become its owner. A slug is generated from the name when omitted.',
    })
    @ApiCreatedResponse({ type: MyOrganizationEntity })
    @ApiConflictResponse({ description: 'Slug already taken' })
    create(
        @CurrentUser('sub') userId: string,
        @Body() dto: CreateOrganizationDto,
    ) {
        return this.organizationsService.create(userId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List the organizations you belong to' })
    @ApiPageResponse(MyOrganizationEntity)
    findAll(
        @CurrentUser('sub') userId: string,
        @Query() query: PaginationQueryDto,
    ) {
        return this.organizationsService.findAllForUser(userId, query);
    }

    @Get(':id')
    @OrgAccess(MembershipRole.VIEWER)
    @ApiOperation({ summary: 'Read an organization' })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiOkResponse({ type: OrganizationDetailEntity })
    @ApiNotFoundResponse({ description: 'Organization not found' })
    findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('sub') userId: string,
    ) {
        return this.organizationsService.findOne(id, userId);
    }

    @Patch(':id')
    @OrgAccess(MembershipRole.ADMIN)
    @AuditLog({ entity: 'Organization' })
    @ApiOperation({
        summary: 'Update an organization',
        description:
            'The slug is permanent. The currency can only change before the first order.',
    })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiOkResponse({ type: OrganizationEntity })
    @ApiConflictResponse({
        description: 'Currency cannot change once orders exist',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateOrganizationDto,
    ) {
        return this.organizationsService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @OrgAccess(MembershipRole.OWNER)
    @AuditLog({ entity: 'Organization', action: AuditAction.DELETE })
    @ApiOperation({
        summary: 'Delete an organization',
        description:
            'Soft delete: nothing is erased and the owner can restore it. Pending invitations are revoked.',
    })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiNoContentResponse({ description: 'Organization deleted' })
    async remove(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('sub') userId: string,
    ) {
        await this.organizationsService.softDelete(id, userId);
    }

    @Post(':id/restore')
    @HttpCode(HttpStatus.OK)
    @AuditLog({ entity: 'Organization', action: AuditAction.RESTORE })
    @ApiOperation({
        summary: 'Restore a deleted organization',
        description:
            'Owner only. Deleted organizations are hidden from the access guards, so ownership is checked inside the service.',
    })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiOkResponse({ type: OrganizationEntity })
    @ApiBadRequestResponse({ description: 'The organization is not deleted' })
    @ApiNotFoundResponse({ description: 'Organization not found' })
    restore(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('sub') userId: string,
    ) {
        return this.organizationsService.restore(id, userId);
    }

    @Patch(':id/transfer')
    @OrgAccess(MembershipRole.OWNER)
    @AuditLog({ entity: 'Organization', action: AuditAction.UPDATE })
    @ApiOperation({
        summary: 'Transfer ownership',
        description:
            'The new owner must be an active member. You become an admin.',
    })
    @ApiParam({ name: 'id', description: 'Organization ID' })
    @ApiOkResponse({ type: OrganizationEntity })
    transfer(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('sub') userId: string,
        @Body() dto: TransferOwnershipDto,
    ) {
        return this.organizationsService.transferOwnership(id, userId, dto);
    }
}
