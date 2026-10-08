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
    ApiPageResponse,
    AuditLog,
    CurrentMembership,
    CurrentUser,
    OrgAccess,
    OrgId,
} from '../common/decorators';
import { PaginationQueryDto } from '../common/dto';
import type { RequestMembership } from '../common/interfaces/authenticated-request.interface';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { toActingMember } from '../common/utils/role.util';
import { MembershipRole } from '../generated/prisma/enums';
import { CreateOrderNoteDto, UpdateOrderNoteDto } from './dto';
import { OrderNoteEntity } from './entities';
import { OrderNotesService } from './order-notes.service';

@ApiTags('Order Notes')
@ApiParam({ name: 'orgId', description: 'Organization ID' })
@ApiParam({ name: 'orderId', description: 'Order ID' })
@Controller('organizations/:orgId/orders/:orderId/notes')
export class OrderNotesController {
    constructor(private readonly orderNotesService: OrderNotesService) {}

    @Get()
    @OrgAccess(MembershipRole.VIEWER)
    @ApiOperation({
        summary: 'List internal notes on an order',
        description: 'Pinned notes first, then newest first. Customers never see notes.',
    })
    @ApiPageResponse(OrderNoteEntity)
    findAll(
        @OrgId() organizationId: string,
        @Param('orderId', ParseUUIDPipe) orderId: string,
        @Query() query: PaginationQueryDto,
    ) {
        return this.orderNotesService.findAll(organizationId, orderId, query);
    }

    @Post()
    @OrgAccess(MembershipRole.MEMBER)
    @AuditLog({ entity: 'OrderNote' })
    @ApiOperation({
        summary: 'Add a note',
        description: "Notifies the order's creator and earlier note authors.",
    })
    @ApiCreatedResponse({ type: OrderNoteEntity })
    create(
        @OrgId() organizationId: string,
        @Param('orderId', ParseUUIDPipe) orderId: string,
        @CurrentUser('sub') userId: string,
        @Body() dto: CreateOrderNoteDto,
    ) {
        return this.orderNotesService.create(organizationId, orderId, userId, dto);
    }

    @Patch(':noteId')
    @OrgAccess(MembershipRole.MEMBER)
    @AuditLog({ entity: 'OrderNote', idParam: 'noteId' })
    @ApiOperation({
        summary: 'Edit or pin a note',
        description: 'Only the author can change the text. Any member can pin or unpin.',
    })
    @ApiParam({ name: 'noteId', description: 'Note ID' })
    @ApiOkResponse({ type: OrderNoteEntity })
    @ApiBadRequestResponse({ description: 'Nothing to update' })
    @ApiForbiddenResponse({ description: 'Only the author can edit the text' })
    update(
        @OrgId() organizationId: string,
        @Param('orderId', ParseUUIDPipe) orderId: string,
        @Param('noteId', ParseUUIDPipe) noteId: string,
        @CurrentUser() user: JwtPayload,
        @CurrentMembership() membership: RequestMembership | undefined,
        @Body() dto: UpdateOrderNoteDto,
    ) {
        return this.orderNotesService.update(
            organizationId,
            orderId,
            noteId,
            toActingMember(user, membership),
            dto,
        );
    }

    @Delete(':noteId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @OrgAccess(MembershipRole.MEMBER)
    @AuditLog({ entity: 'OrderNote', idParam: 'noteId' })
    @ApiOperation({
        summary: 'Delete a note',
        description: 'The author or an admin. The audit log keeps the original text.',
    })
    @ApiParam({ name: 'noteId', description: 'Note ID' })
    @ApiNoContentResponse({ description: 'Note deleted' })
    @ApiNotFoundResponse({ description: 'Note not found' })
    async remove(
        @OrgId() organizationId: string,
        @Param('orderId', ParseUUIDPipe) orderId: string,
        @Param('noteId', ParseUUIDPipe) noteId: string,
        @CurrentUser() user: JwtPayload,
        @CurrentMembership() membership: RequestMembership | undefined,
    ) {
        await this.orderNotesService.remove(
            organizationId,
            orderId,
            noteId,
            toActingMember(user, membership),
        );
    }
}