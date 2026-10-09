import {
    Injectable,
    Logger,
    NotFoundException,
    OnModuleDestroy,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import {
    finalize,
    interval,
    map,
    merge,
    Observable,
    startWith,
    Subject,
} from 'rxjs';
import { pageArgs, toPage } from '../../common/utils/pagination.util';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { QueryNotificationsDto } from './dto';
import { NotificationEntity } from './entities';
import type { NotificationInput } from './notifications.types';

const HEARTBEAT_INTERVAL_MS = 25_000;

@Injectable()
export class NotificationsService implements OnModuleDestroy {
    private readonly logger = new Logger(NotificationsService.name);
    /** One live channel per user, shared by all of that user's open streams. */
    private readonly channels = new Map<string, Subject<MessageEvent>>();

    constructor(private readonly prisma: PrismaService) {}

    onModuleDestroy(): void {
        for (const channel of this.channels.values()) channel.complete();
        this.channels.clear();
    }

    // ── Used by other modules ─────────────────────────────────────────────

    /** Stores a notification and pushes it to the user's open streams. */
    async createAndEmit(
        userId: string,
        input: NotificationInput,
    ): Promise<NotificationEntity> {
        const record = await this.prisma.notification.create({
            data: this.toData(userId, input),
        });
        const notification = new NotificationEntity(record);
        this.emit(userId, notification);
        return notification;
    }

    /** One query for any number of recipients. Duplicate IDs are ignored. */
    async createAndEmitMany(
        userIds: string[],
        input: NotificationInput,
    ): Promise<void> {
        const recipients = [...new Set(userIds)];
        if (recipients.length === 0) return;

        const records = await this.prisma.notification.createManyAndReturn({
            data: recipients.map((userId) => this.toData(userId, input)),
        });
        for (const record of records) {
            this.emit(record.userId, new NotificationEntity(record));
        }
    }

    // ── Inbox ─────────────────────────────────────────────────────────────

    async findAll(userId: string, query: QueryNotificationsDto) {
        const where: Prisma.NotificationWhereInput = {
            userId,
            isRead: query.isRead,
            type: query.type,
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.notification.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                ...pageArgs(query),
            }),
            this.prisma.notification.count({ where }),
        ]);

        return toPage(
            items.map((item) => new NotificationEntity(item)),
            total,
            query,
        );
    }

    async getUnreadCount(userId: string): Promise<{ count: number }> {
        const count = await this.prisma.notification.count({
            where: { userId, isRead: false },
        });
        return { count };
    }

    async markAsRead(userId: string, id: string): Promise<NotificationEntity> {
        const existing = await this.prisma.notification.findFirst({
            where: { id, userId },
        });
        if (!existing) throw new NotFoundException('Notification not found');
        if (existing.isRead) return new NotificationEntity(existing);

        const updated = await this.prisma.notification.update({
            where: { id },
            data: { isRead: true, readAt: new Date() },
        });
        return new NotificationEntity(updated);
    }

    async markAllAsRead(userId: string): Promise<{ updated: number }> {
        const { count } = await this.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        return { updated: count };
    }

    async remove(userId: string, id: string): Promise<void> {
        const { count } = await this.prisma.notification.deleteMany({
            where: { id, userId },
        });
        if (count === 0) throw new NotFoundException('Notification not found');
    }

    // ── Live stream ───────────────────────────────────────────────────────

    /**
     * Events: "ready" once on connect, "notification" for each new one, and a
     * "heartbeat" every 25 seconds so proxies do not close an idle connection.
     */
    stream(userId: string): Observable<MessageEvent> {
        const channel = this.channelFor(userId);
        const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
            map((): MessageEvent => ({
                type: 'heartbeat',
                data: { at: new Date().toISOString() },
            })),
        );

        return merge(channel.asObservable(), heartbeat$).pipe(
            startWith<MessageEvent>({
                type: 'ready',
                data: { connectedAt: new Date().toISOString() },
            }),
            finalize(() => this.release(userId)),
        );
    }

    private channelFor(userId: string): Subject<MessageEvent> {
        let channel = this.channels.get(userId);
        if (!channel) {
            channel = new Subject<MessageEvent>();
            this.channels.set(userId, channel);
        }
        return channel;
    }

    private release(userId: string): void {
        const channel = this.channels.get(userId);
        if (channel && !channel.observed) {
            channel.complete();
            this.channels.delete(userId);
        }
    }

    private emit(userId: string, notification: NotificationEntity): void {
        this.channels.get(userId)?.next({
            id: notification.id,
            type: 'notification',
            data: notification,
        });
    }

    private toData(
        userId: string,
        input: NotificationInput,
    ): Prisma.NotificationCreateManyInput {
        return {
            userId,
            type: input.type,
            title: input.title,
            body: input.body ?? null,
            resourceType: input.resourceType ?? null,
            resourceId: input.resourceId ?? null,
            meta: input.meta ?? {},
        };
    }
}
