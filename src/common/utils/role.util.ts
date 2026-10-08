import type { MembershipRole } from '../../generated/prisma/enums';

export const ROLE_LEVEL: Record<MembershipRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
};

/**
 * True when `actual` is at least as senior as the lowest role in `allowed`.
 * Shared by RolesGuard and by services that make role decisions.
 */
export function hasMinimumRole(
    actual: MembershipRole,
    allowed: readonly MembershipRole[],
): boolean {
    const required = Math.min(...allowed.map((role) => ROLE_LEVEL[role]));
    return ROLE_LEVEL[actual] >= required;
}