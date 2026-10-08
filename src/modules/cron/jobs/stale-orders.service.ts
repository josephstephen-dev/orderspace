import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { formatOrderNumber } from '../../../common/utils/format.util';
import { PrismaService } from '../../../database/prisma.service';
import { NotificationType, OrderStatus } from '../../../generated/prisma/enums';
import { MembershipsService } from '../../memberships/memberships.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { runJob } from './job-runner';

const STALE_AFTER_DAYS = 3;
const MAX_ORDERS_PER_RUN = 1000;
const ORDERS_PER_ALERT = 10;

/**
 * Daily at 08:00 UTC: tells organization admins about orders that have sat in
 * PENDING for more than 3 days. Each order is flagged once, atomically.
 */
@Injectable()
export class StaleOrdersService {
    private readonly logger = new Logger(StaleOrdersService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly membershipsService: MembershipsService,
    ) {}

    @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'stale-orders', timeZone: 'UTC' })
    handle(): Promise<void> {
        return runJob(this.logger, 'Stale-order reminder', async () => {
            const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000);

            const candidates = await this.prisma.order.findMany({
                where: {
                    status: OrderStatus.PENDING,
                    deletedAt: null,
                    staleNotifiedAt: null,
                    statusChangedAt: { lt: cutoff },
                    organization: { deletedAt: null },
                },
                select: { id: true, organizationId: true, orderNumber: true },
                orderBy: { statusChangedAt: 'asc' },
                take: MAX_ORDERS_PER_RUN,
            });

            const claimed = new Map<string, Array<{ id: string; orderNumber: number }>>();
            for (const order of candidates) {
                const { count } = await this.prisma.order.updateMany({
                    where: { id: order.id, staleNotifiedAt: null },
                    data: { staleNotifiedAt: new Date() },
                });
                if (count !== 1) continue;
                const list = claimed.get(order.organizationId) ?? [];
                list.push({ id: order.id, orderNumber: order.orderNumber });
                claimed.set(order.organizationId, list);
            }

            const recipients = await this.membershipsService.findAdminRecipients([
                ...claimed.keys(),
            ]);

            let alerted = 0;
            let orders = 0;
            for (const [organizationId, list] of claimed) {
                orders += list.length;
                const admins = recipients.get(organizationId) ?? [];
                if (admins.length === 0) continue;
                try {
                    await this.notify(organizationId, list, admins.map((admin) => admin.id));
                    alerted += 1;
                } catch (error) {
                    await this.prisma.order.updateMany({
                        where: { id: { in: list.map((order) => order.id) } },
                        data: { staleNotifiedAt: null },
                    });
                    this.logger.warn(`Reminder for ${organizationId} failed: ${String(error)}`);
                }
            }
            return `${orders} stale order(s), ${alerted} organization(s) notified`;
        });
    }

    private notify(
        organizationId: string,
        orders: Array<{ id: string; orderNumber: number }>,
        adminIds: string[],
    ): Promise<void> {
        const single = orders.length === 1 ? orders[0] : null;
        const numbers = orders
            .slice(0, ORDERS_PER_ALERT)
            .map((order) => formatOrderNumber(order.orderNumber));

        return this.notificationsService.createAndEmitMany(adminIds, {
            type: NotificationType.ORDER_STALE,
            title: single
                ? `Order ${numbers[0]} is waiting for confirmation`
                : `${orders.length} orders are waiting for confirmation`,
            body: `Pending for more than ${STALE_AFTER_DAYS} days: ${numbers.join(', ')}${
                orders.length > numbers.length
                    ? `, and ${orders.length - numbers.length} more`
                    : ''
            }.`,
            resourceType: single ? 'Order' : 'Organization',
            resourceId: single ? single.id : organizationId,
            meta: {
                organizationId,
                totalCount: orders.length,
                orderIds: orders.slice(0, ORDERS_PER_ALERT).map((order) => order.id),
            },
        });
    }
}