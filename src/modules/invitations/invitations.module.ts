import { Module } from '@nestjs/common';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvitationsController, OrgInvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
    imports: [NotificationsModule, MembershipsModule],
    controllers: [OrgInvitationsController, InvitationsController],
    providers: [InvitationsService],
    exports: [InvitationsService],
})
export class InvitationsModule {}