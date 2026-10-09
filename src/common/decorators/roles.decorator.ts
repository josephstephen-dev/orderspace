import { SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '../../generated/prisma/enums';

export const ROLES_KEY = 'roles';

/**
 * Requires at least the LOWEST of the listed roles, using the hierarchy
 * OWNER > ADMIN > MEMBER > VIEWER. For example, @Roles(MembershipRole.ADMIN)
 * allows both ADMIN and OWNER.
 */
export const Roles = (...roles: MembershipRole[]) =>
    SetMetadata(ROLES_KEY, roles);
