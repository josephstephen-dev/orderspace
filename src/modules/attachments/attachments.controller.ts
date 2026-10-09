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
} from '@nestjs/common';
import {
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import {
    AuditLog,
    CurrentMembership,
    CurrentUser,
    OrgAccess,
} from '../../common/decorators';
import type { RequestMembership } from '../../common/interfaces/authenticated-request.interface';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { toActingMember } from '../../common/utils/role.util';
import { MembershipRole } from '../../generated/prisma/enums';
import { AttachmentsService } from './attachments.service';
import { SaveAttachmentDto } from './dto';
import { AttachmentEntity } from './entities';

@ApiTags('Attachments')
@ApiParam({ name: 'orderId', description: 'Order ID' })
@Controller('orders/:orderId/attachments')
export class AttachmentsController {
    constructor(private readonly attachmentsService: AttachmentsService) {}

    @Get()
    @OrgAccess(MembershipRole.VIEWER)
    @ApiOperation({ summary: 'List the files attached to an order' })
    @ApiOkResponse({ type: [AttachmentEntity] })
    findAll(@Param('orderId', ParseUUIDPipe) orderId: string) {
        return this.attachmentsService.findAll(orderId);
    }

    @Post()
    @OrgAccess(MembershipRole.MEMBER)
    @AuditLog({ entity: 'Attachment' })
    @ApiOperation({
        summary: 'Attach a file',
        description:
            'Call this after the browser has uploaded the file through /api/uploadthing. An order holds at most 20 attachments.',
    })
    @ApiCreatedResponse({ type: AttachmentEntity })
    @ApiConflictResponse({
        description: 'Already attached, or the order is full',
    })
    save(
        @Param('orderId', ParseUUIDPipe) orderId: string,
        @CurrentUser('sub') userId: string,
        @Body() dto: SaveAttachmentDto,
    ) {
        return this.attachmentsService.save(orderId, userId, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @OrgAccess(MembershipRole.MEMBER)
    @AuditLog({ entity: 'Attachment' })
    @ApiOperation({
        summary: 'Remove an attachment',
        description:
            'The uploader or an admin. Uploaded files are deleted from storage too.',
    })
    @ApiParam({ name: 'id', description: 'Attachment ID' })
    @ApiNoContentResponse({ description: 'Attachment removed' })
    @ApiForbiddenResponse({ description: 'Not the uploader and not an admin' })
    @ApiNotFoundResponse({ description: 'Attachment not found' })
    async remove(
        @Param('orderId', ParseUUIDPipe) orderId: string,
        @Param('id', ParseUUIDPipe) attachmentId: string,
        @CurrentUser() user: JwtPayload,
        @CurrentMembership() membership: RequestMembership | undefined,
    ) {
        await this.attachmentsService.remove(
            orderId,
            attachmentId,
            toActingMember(user, membership),
        );
    }
}
