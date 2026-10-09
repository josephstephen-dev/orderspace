import { BadRequestException, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { PrismaService } from '../../database/prisma.service';
import type { RequestMembership } from '../interfaces/authenticated-request.interface';

type RouteParams = Record<string, string | string[] | undefined>;

export interface TenantContext {
    organizationId: string;
    /** Present when the tenant was resolved through an order. */
    orderId?: string;
}

function readParam(params: RouteParams, name: string): string | undefined {
    const value = params[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function assertUuid(value: string, label: string): void {
    if (!isUUID(value)) {
        throw new BadRequestException(`Invalid ${label}`);
    }
}

/**
 * Works out which organization a request belongs to.
 * Order of resolution: :orgId, then :orderId, then :id (an organization ID).
 * When both :orgId and :orderId are present the order must belong to that
 * organization, otherwise the request is treated as not found.
 */
export async function resolveTenant(
    prisma: PrismaService,
    params: RouteParams,
): Promise<TenantContext | undefined> {
    const orgId = readParam(params, 'orgId');
    const orderId = readParam(params, 'orderId');
    const id = readParam(params, 'id');

    if (orgId) assertUuid(orgId, 'organization ID');

    if (orderId) {
        assertUuid(orderId, 'order ID');
        const order = await prisma.order.findFirst({
            where: { id: orderId, deletedAt: null },
            select: { organizationId: true },
        });
        if (!order || (orgId && order.organizationId !== orgId)) {
            throw new NotFoundException('Order not found');
        }
        return { organizationId: order.organizationId, orderId };
    }

    if (orgId) return { organizationId: orgId };

    if (id) {
        assertUuid(id, 'organization ID');
        return { organizationId: id };
    }

    return undefined;
}

/** Loads the user's membership, but only while the organization is not deleted. */
export function findActiveMembership(
    prisma: PrismaService,
    userId: string,
    organizationId: string,
): Promise<RequestMembership | null> {
    return prisma.membership.findFirst({
        where: {
            userId,
            organizationId,
            organization: { deletedAt: null },
        },
        select: { userId: true, organizationId: true, role: true },
    });
}
