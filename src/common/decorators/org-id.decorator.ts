import {
    createParamDecorator,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

/**
 * Injects the organization ID for the current request. It also works on nested
 * routes such as /orders/:orderId/attachments, where the guards resolve the
 * organization from the order.
 */
export const OrgId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        const fromParams = request.params['orgId'];
        const organizationId =
            request.organizationId ??
            (typeof fromParams === 'string' ? fromParams : undefined);

        if (!organizationId) {
            throw new ForbiddenException('Organization context required');
        }
        return organizationId;
    },
);
