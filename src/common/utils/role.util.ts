import { GlobalRole, MembershipRole } from '../../generated/prisma/enums';
import type { ActingMember } from '../interfaces/acting-member.interface';
import type { RequestMembership } from '../interfaces/authenticated-request.interface';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

export const ROLE_LEVEL: Record<MembershipRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
};

/** Roles that can be handed out through invitations and role changes. */
export const ASSIGNABLE_ROLES = [
    MembershipRole.ADMIN,
    MembershipRole.MEMBER,
    MembershipRole.VIEWER,
] as const;

/** True when `actual` is at least as senior as the lowest role in `allowed`. */
export function hasMinimumRole(
    actual: MembershipRole,
    allowed: readonly MembershipRole[],
): boolean {
    const required = Math.min(...allowed.map((role) => ROLE_LEVEL[role]));
    return ROLE_LEVEL[actual] >= required;
}

/** True when `higher` is strictly more senior than `lower`. */
export function outranks(higher: MembershipRole, lower: MembershipRole): boolean {
    return ROLE_LEVEL[higher] > ROLE_LEVEL[lower];
}

/**
 * The caller as seen by member-management rules. Platform operators act with
 * owner authority. A missing membership falls back to the lowest role.
 */
export function toActingMember(
    user: JwtPayload,
    membership?: RequestMembership,
): ActingMember {
    const role =
        user.globalRole === GlobalRole.SUPER_ADMIN
            ? MembershipRole.OWNER
            : (membership?.role ?? MembershipRole.VIEWER);
    return { userId: user.sub, role };
}