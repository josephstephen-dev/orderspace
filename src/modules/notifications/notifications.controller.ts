import {
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Query,
    Sse,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import {
    ApiNoContentResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProduces,
    ApiTags,
} from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { ApiAuth, ApiPageResponse, CurrentUser } from '../../common/decorators';
import { QueryNotificationsDto } from './dto';
import { NotificationEntity } from './entities';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiAuth()
@Controller('notifications')
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get()
    @ApiOperation({ summary: 'List your notifications' })
    @ApiPageResponse(NotificationEntity)
    findAll(
        @CurrentUser('sub') userId: string,
        @Query() query: QueryNotificationsDto,
    ) {
        return this.notificationsService.findAll(userId, query);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Number of unread notifications, for a badge' })
    @ApiOkResponse({
        schema: { properties: { count: { type: 'number', example: 5 } } },
    })
    getUnreadCount(@CurrentUser('sub') userId: string) {
        return this.notificationsService.getUnreadCount(userId);
    }

    @Sse('stream')
    @ApiOperation({
        summary: 'Live notification stream (Server-Sent Events)',
        description:
            'Events: ready, notification and heartbeat. Browsers cannot attach an Authorization header to EventSource, so connect with a fetch-based SSE client.',
    })
    @ApiProduces('text/event-stream')
    stream(@CurrentUser('sub') userId: string): Observable<MessageEvent> {
        return this.notificationsService.stream(userId);
    }

    @Patch('read-all')
    @ApiOperation({ summary: 'Mark every notification as read' })
    @ApiOkResponse({
        schema: { properties: { updated: { type: 'number', example: 12 } } },
    })
    markAllAsRead(@CurrentUser('sub') userId: string) {
        return this.notificationsService.markAllAsRead(userId);
    }

    @Patch(':id/read')
    @ApiOperation({ summary: 'Mark one notification as read' })
    @ApiParam({ name: 'id', description: 'Notification ID' })
    @ApiOkResponse({ type: NotificationEntity })
    @ApiNotFoundResponse({ description: 'Notification not found' })
    markAsRead(
        @CurrentUser('sub') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.notificationsService.markAsRead(userId, id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a notification' })
    @ApiParam({ name: 'id', description: 'Notification ID' })
    @ApiNoContentResponse({ description: 'Deleted' })
    @ApiNotFoundResponse({ description: 'Notification not found' })
    async remove(
        @CurrentUser('sub') userId: string,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.notificationsService.remove(userId, id);
    }
}