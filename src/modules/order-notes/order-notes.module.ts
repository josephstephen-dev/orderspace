import { Module } from '@nestjs/common';
import { NotificationsModule } from 'notifications/notifications.module';
import { OrderNotesController } from './order-notes.controller';
import { OrderNotesService } from './order-notes.service';

@Module({
    imports: [NotificationsModule],
    controllers: [OrderNotesController],
    providers: [OrderNotesService],
    exports: [OrderNotesService],
})
export class OrderNotesModule {}