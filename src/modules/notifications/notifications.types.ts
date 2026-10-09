import type { Prisma } from '../../generated/prisma/client';
import type { NotificationType } from '../../generated/prisma/enums';

/** What other services pass in to create a notification. */
export interface NotificationInput {
    type: NotificationType;
    title: string;
    body?: string;
    resourceType?: string;
    resourceId?: string;
    meta?: Prisma.InputJsonObject;
}
