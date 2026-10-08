import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../../../generated/prisma/enums';

export class NotificationEntity {
    @ApiProperty({ example: '0b8a6c44-6b9d-4b9f-9a77-1d5f3d1f0a21' })
    id: string;

    @ApiProperty({ enum: NotificationType, example: NotificationType.LOW_STOCK })
    type: NotificationType;

    @ApiProperty({ example: '3 products are low on stock' })
    title: string;

    @ApiProperty({ type: String, nullable: true })
    body: string | null;

    @ApiProperty({ example: false })
    isRead: boolean;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    readAt: Date | null;

    @ApiProperty({ type: String, nullable: true, example: 'Order' })
    resourceType: string | null;

    @ApiProperty({ type: String, nullable: true })
    resourceId: string | null;

    @ApiProperty({
        type: Object,
        description: 'Extra context, such as the organization the event belongs to',
    })
    meta: Record<string, unknown>;

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: Date;

    constructor(source: NotificationSource) {
        this.id = source.id;
        this.type = source.type;
        this.title = source.title;
        this.body = source.body;
        this.isRead = source.isRead;
        this.readAt = source.readAt;
        this.resourceType = source.resourceType;
        this.resourceId = source.resourceId;
        this.meta = (source.meta ?? {}) as Record<string, unknown>;
        this.createdAt = source.createdAt;
    }
}

export interface NotificationSource {
    id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    isRead: boolean;
    readAt: Date | null;
    resourceType: string | null;
    resourceId: string | null;
    meta: unknown;
    createdAt: Date;
}