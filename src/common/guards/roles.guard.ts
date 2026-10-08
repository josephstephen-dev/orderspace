import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import { GlobalRole, MembershipRole } from '../../generated/prisma/enums';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type {
    AuthenticatedRequest,
    RequestMembership,
} from '../interfaces/authenticated-request.interface';
import { hasMinimumRole } from '../utils/role.util';
import { findActiveMembership, resolveTenant } from '../utils/tenant.util';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredRoles = this.reflector.getAllAndOverride<
            MembershipRole[] | undefined
        >(ROLES_KEY, [context.getHandler(), context.getClass()]);

        if (!requiredRoles || requiredRoles.length === 0) return true;

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const user = request.user;
        if (!user) {
            throw new UnauthorizedException('Authentication required');
        }

        if (user.globalRole === GlobalRole.SUPER_ADMIN) return true;

        // OrgMemberGuard normally supplies the membership. The fallback keeps
        // RolesGuard safe if it is ever used on its own.
        const membership =
            request.membership ??
            (await this.loadMembership(request, user.sub));

        if (!hasMinimumRole(membership.role, requiredRoles)) {
            throw new ForbiddenException('Insufficient role');
        }

        request.membership = membership;
        return true;
    }

    private async loadMembership(
        request: AuthenticatedRequest,
        userId: string,
    ): Promise<RequestMembership> {
        const tenant = await resolveTenant(this.prisma, request.params);
        if (!tenant) {
            throw new ForbiddenException(
                'Organization context required for role check',
            );
        }
        request.organizationId = tenant.organizationId;

        const membership = await findActiveMembership(
            this.prisma,
            userId,
            tenant.organizationId,
        );
        if (!membership) {
            throw new ForbiddenException(
                'You are not a member of this organization',
            );
        }
        return membership;
    }
}