import { registerAs } from '@nestjs/config';
import { durationEnv, durationToMs, optionalEnv, requireEnv } from './env';

export interface JwtConfig {
    /** Signs access tokens. */
    secret: string;
    accessExpiresIn: string;
    /** Keys the stored hash of refresh tokens. */
    refreshSecret: string;
    refreshExpiresIn: string;
    refreshExpiresInMs: number;
}

const MIN_PRODUCTION_SECRET_LENGTH = 32;

export const jwtConfig = registerAs('jwt', (): JwtConfig => {
    const secret = requireEnv('JWT_SECRET');
    const refreshSecret = requireEnv('JWT_REFRESH_SECRET');

    if (secret === refreshSecret) {
        throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
    }

    if (optionalEnv('NODE_ENV', 'development') === 'production') {
        for (const [name, value] of [
            ['JWT_SECRET', secret],
            ['JWT_REFRESH_SECRET', refreshSecret],
        ]) {
            if (value.length < MIN_PRODUCTION_SECRET_LENGTH) {
                throw new Error(
                    `${name} must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
                );
            }
        }
    }

    const refreshExpiresIn = durationEnv('JWT_REFRESH_EXPIRES_IN', '7d');

    return {
        secret,
        accessExpiresIn: durationEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
        refreshSecret,
        refreshExpiresIn,
        refreshExpiresInMs: durationToMs(refreshExpiresIn),
    };
});
