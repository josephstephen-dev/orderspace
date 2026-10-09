import { applyDecorators, UseGuards } from '@nestjs/common';
import type { MembershipRole } from '../../generated/prisma/enums';
import { OrgMemberGuard } from '../guards/org-member.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ApiOrgAccess } from './api-docs.decorator';
import { Roles } from './roles.decorator';

/**
 * Everything a tenant-scoped route needs in one decorator: membership check,
 * minimum role, and the matching Swagger responses.
 *
 *   @OrgAccess(MembershipRole.ADMIN)
 */
export const OrgAccess = (minimumRole: MembershipRole) =>
    applyDecorators(
        UseGuards(OrgMemberGuard, RolesGuard),
        Roles(minimumRole),
        ApiOrgAccess(),
    );
