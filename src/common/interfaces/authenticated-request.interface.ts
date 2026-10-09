import type { Request } from 'express';
import type { MembershipRole } from '../../generated/prisma/enums';
import type { JwtPayload } from './jwt-payload.interface';

/** The slice of a membership record that guards attach to the request. */
export interface RequestMembership {
    userId: string;
    organizationId: string;
    role: MembershipRole;
}

/**
 * Express request after the access-control guards have run.
 * - `user` is set by JwtAuthGuard
 * - `organizationId` and `membership` are set by OrgMemberGuard / RolesGuard
 */
export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
    organizationId?: string;
    membership?: RequestMembership;
}
