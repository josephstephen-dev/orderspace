import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
    InvitationExpiryService,
    LowStockAlertService,
    NotificationCleanupService,
    StaleOrdersService,
    TokenCleanupService,
} from './jobs';

@Module({
    imports: [ScheduleModule.forRoot(), NotificationsModule, MembershipsModule],
    providers: [
        InvitationExpiryService,
        LowStockAlertService,
        NotificationCleanupService,
        StaleOrdersService,
        TokenCleanupService,
    ],
})
export class CronModule {}
