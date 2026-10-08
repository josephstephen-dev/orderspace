import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { runJob } from './job-runner';

const DAY_MS = 24 * 60 * 60 * 1000;
const READ_RETENTION_DAYS = 90;
const MAX_RETENTION_DAYS = 365;

/** Daily at 03:00 UTC: removes read notifications after 90 days and any after a year. */
@Injectable()
export class NotificationCleanupService {
    private readonly logger = new Logger(NotificationCleanupService.name);

    constructor(private readonly prisma: PrismaService) {}

    @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'notification-cleanup', timeZone: 'UTC' })
    handle(): Promise<void> {
        return runJob(this.logger, 'Notification cleanup', async () => {
            const now = Date.now();
            const { count } = await this.prisma.notification.deleteMany({
                where: {
                    OR: [
                        {
                            isRead: true,
                            readAt: { lt: new Date(now - READ_RETENTION_DAYS * DAY_MS) },
                        },
                        { createdAt: { lt: new Date(now - MAX_RETENTION_DAYS * DAY_MS) } },
                    ],
                },
            });
            return `${count} notification(s) removed`;
        });
    }
}