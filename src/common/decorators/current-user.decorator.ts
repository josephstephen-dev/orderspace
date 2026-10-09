import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Injects the authenticated user's token payload.
 * @CurrentUser() gives the whole payload, @CurrentUser('sub') gives the user ID.
 */
export const CurrentUser = createParamDecorator(
    (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
        const user = request.user;
        return field ? user?.[field] : user;
    },
);
