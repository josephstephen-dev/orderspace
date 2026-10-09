import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) return true;

        const request = context
            .switchToHttp()
            .getRequest<AuthenticatedRequest>();
        const token = this.extractBearerToken(request);
        if (!token) {
            throw new UnauthorizedException('Missing access token');
        }

        try {
            request.user = await this.jwtService.verifyAsync<JwtPayload>(token);
        } catch (error) {
            const expired =
                error instanceof Error && error.name === 'TokenExpiredError';
            throw new UnauthorizedException(
                expired ? 'Access token expired' : 'Invalid access token',
            );
        }

        return true;
    }

    private extractBearerToken(request: AuthenticatedRequest): string | null {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type?.toLowerCase() === 'bearer' && token ? token : null;
    }
}
