import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../database/prisma.service';
import {
    NotificationType,
    ProductStatus,
} from '../../../generated/prisma/enums';
import { EmailService } from '../../email/email.service';
import { EmailTemplate } from '../../email/email.types';
import {
    AdminRecipient,
    MembershipsService,
} from '../../memberships/memberships.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { runJob } from './job-runner';

const SCAN_BATCH_SIZE = 500;
const PRODUCTS_PER_ALERT = 10;

interface LowStockProduct {
    id: string;
    organizationId: string;
    sku: string | null;
    name: string;
    stockQuantity: number;
    lowStockThreshold: number;
}

/**
 * Every 6 hours: alerts organization admins about products at or below their
 * threshold. A product alerts once, then again only after it has been restocked
 * above its threshold. Each product is claimed atomically, so running on
 * several instances never double-sends.
 */
@Injectable()
export class LowStockAlertService {
    private readonly logger = new Logger(LowStockAlertService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly membershipsService: MembershipsService,
        private readonly emailService: EmailService,
    ) {}

    @Cron(CronExpression.EVERY_6_HOURS, {
        name: 'low-stock-alert',
        timeZone: 'UTC',
    })
    handle(): Promise<void> {
        return runJob(this.logger, 'Low-stock alert', async () => {
            const reset = await this.resetRecovered();
            const claimed = await this.claimLowStock();
            const alerted = await this.alertOrganizations(claimed);
            const products = [...claimed.values()].reduce(
                (sum, list) => sum + list.length,
                0,
            );
            return `${products} new low-stock product(s), ${alerted} organization(s) alerted, ${reset} recovered`;
        });
    }

    /** Clears the flag on products restocked above their threshold. */
    private async resetRecovered(): Promise<number> {
        const flagged = await this.prisma.product.findMany({
            where: { lowStockAlertedAt: { not: null } },
            select: { id: true, stockQuantity: true, lowStockThreshold: true },
        });
        const recovered = flagged
            .filter(
                (product) => product.stockQuantity > product.lowStockThreshold,
            )
            .map((product) => product.id);
        if (recovered.length === 0) return 0;

        const { count } = await this.prisma.product.updateMany({
            where: { id: { in: recovered } },
            data: { lowStockAlertedAt: null },
        });
        return count;
    }

    private async claimLowStock(): Promise<Map<string, LowStockProduct[]>> {
        const claimed = new Map<string, LowStockProduct[]>();
        let cursor: string | undefined;

        for (;;) {
            const batch = await this.prisma.product.findMany({
                where: {
                    status: ProductStatus.ACTIVE,
                    deletedAt: null,
                    lowStockAlertedAt: null,
                    lowStockThreshold: { gt: 0 },
                    organization: { deletedAt: null },
                },
                select: {
                    id: true,
                    organizationId: true,
                    sku: true,
                    name: true,
                    stockQuantity: true,
                    lowStockThreshold: true,
                },
                orderBy: { id: 'asc' },
                take: SCAN_BATCH_SIZE,
                ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            });
            if (batch.length === 0) return claimed;
            cursor = batch[batch.length - 1].id;

            for (const product of batch) {
                // Two columns cannot be compared in a Prisma filter.
                if (product.stockQuantity > product.lowStockThreshold) continue;

                const { count } = await this.prisma.product.updateMany({
                    where: { id: product.id, lowStockAlertedAt: null },
                    data: { lowStockAlertedAt: new Date() },
                });
                if (count !== 1) continue;

                const list = claimed.get(product.organizationId) ?? [];
                list.push(product);
                claimed.set(product.organizationId, list);
            }
            if (batch.length < SCAN_BATCH_SIZE) return claimed;
        }
    }

    private async alertOrganizations(
        claimed: Map<string, LowStockProduct[]>,
    ): Promise<number> {
        const organizationIds = [...claimed.keys()];
        if (organizationIds.length === 0) return 0;

        const [organizations, recipients] = await Promise.all([
            this.prisma.organization.findMany({
                where: { id: { in: organizationIds } },
                select: { id: true, name: true },
            }),
            this.membershipsService.findAdminRecipients(organizationIds),
        ]);
        const names = new Map(organizations.map((org) => [org.id, org.name]));

        let alerted = 0;
        for (const [organizationId, products] of claimed) {
            try {
                await this.alert(
                    organizationId,
                    names.get(organizationId) ?? 'your organization',
                    products,
                    recipients.get(organizationId) ?? [],
                );
                alerted += 1;
            } catch (error) {
                // Let the next run try again.
                await this.prisma.product.updateMany({
                    where: {
                        id: { in: products.map((product) => product.id) },
                    },
                    data: { lowStockAlertedAt: null },
                });
                this.logger.warn(
                    `Alert for ${organizationId} failed: ${String(error)}`,
                );
            }
        }
        return alerted;
    }

    private async alert(
        organizationId: string,
        organizationName: string,
        products: LowStockProduct[],
        admins: AdminRecipient[],
    ): Promise<void> {
        if (admins.length === 0) return;

        const shown = products.slice(0, PRODUCTS_PER_ALERT).map((product) => ({
            id: product.id,
            sku: product.sku ?? '',
            name: product.name,
            stockQuantity: product.stockQuantity,
            lowStockThreshold: product.lowStockThreshold,
        }));
        const single = products.length === 1 ? products[0] : null;

        await this.notificationsService.createAndEmitMany(
            admins.map((admin) => admin.id),
            {
                type: NotificationType.LOW_STOCK,
                title: single
                    ? `Low stock: ${single.name}`
                    : `${products.length} products are low on stock`,
                body: single
                    ? `${single.sku ?? single.name} has ${single.stockQuantity} left (alert level ${single.lowStockThreshold}).`
                    : shown
                          .slice(0, 3)
                          .map((product) => product.name)
                          .join(', ') +
                      (products.length > 3
                          ? `, and ${products.length - 3} more`
                          : ''),
                resourceType: single ? 'Product' : 'Organization',
                resourceId: single ? single.id : organizationId,
                meta: {
                    organizationId,
                    totalCount: products.length,
                    products: shown,
                },
            },
        );

        const results = await Promise.all(
            admins.map((admin) =>
                this.emailService.trySend(EmailTemplate.LOW_STOCK_ALERT, {
                    to: admin.email,
                    name: admin.name,
                    organizationName,
                    totalCount: products.length,
                    products: shown,
                }),
            ),
        );
        const failed = results.filter((ok) => !ok).length;
        if (failed > 0) {
            this.logger.warn(
                `${failed} low-stock email(s) failed for ${organizationName}`,
            );
        }
    }
}
