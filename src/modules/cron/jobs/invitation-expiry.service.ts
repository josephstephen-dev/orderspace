import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import { InvitationStatus } from '../../../generated/prisma/enums';
import { runJob } from './job-runner';

/** Hourly: marks pending invitations EXPIRED once they pass expiresAt. */
@Injectable()
export class InvitationExpiryService {
    private readonly logger = new Logger(InvitationExpiryService.name);

    constructor(private readonly prisma: PrismaService) {}

    @Cron(CronExpression.EVERY_HOUR, { name: 'invitation-expiry', timeZone: 'UTC' })
    handle(): Promise<void> {
        return runJob(this.logger, 'Invitation expiry', async () => {
            const { count } = await this.prisma.invitation.updateMany({
                where: {
                    status: InvitationStatus.PENDING,
                    expiresAt: { lt: new Date() },
                },
                data: { status: InvitationStatus.EXPIRED },
            });
            return `${count} invitation(s) expired`;
        });
    }
}