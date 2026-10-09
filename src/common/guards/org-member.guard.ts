import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GlobalRole } from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { findActiveMembership, resolveTenant } from '../utils/tenant.util';

/**
 * Confirms the caller belongs to the organization named by the route, then
 * stores `organizationId` and `membership` on the request for later use.
 * Must run after JwtAuthGuard. List it before RolesGuard in @UseGuards().
 */
@Injectable()
export class OrgMemberGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();
        const user = request.user;
        if (!user) {
            throw new UnauthorizedException('Authentication required');
        }

        const tenant = await resolveTenant(this.prisma, request.params);
        if (!tenant) {
            throw new ForbiddenException('Organization context required');
        }
        request.organizationId = tenant.organizationId;

        // Platform operators skip the membership check but still get a
        // resolved organization, so audit logs and @OrgId() stay correct.
        if (user.globalRole === GlobalRole.SUPER_ADMIN) return true;

        const membership = await findActiveMembership(
            this.prisma,
            user.sub,
            tenant.organizationId,
        );
        if (!membership) {
            throw new ForbiddenException(
                'You are not a member of this organization',
            );
        }

        request.membership = membership;
        return true;
    }
}
