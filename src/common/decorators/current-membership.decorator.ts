import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type {
    AuthenticatedRequest,
    RequestMembership,
} from '../interfaces/authenticated-request.interface';

/** The caller's membership in the current organization (set by the guards). */
export const CurrentMembership = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): RequestMembership | undefined =>
        ctx.switchToHttp().getRequest<AuthenticatedRequest>().membership,
);
