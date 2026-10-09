import type { GlobalRole } from '../../generated/prisma/enums';

export interface JwtPayload {
    /** The user's ID (the JWT "subject"). */
    sub: string;
    email: string;
    globalRole: GlobalRole;
    iat?: number;
    exp?: number;
}
