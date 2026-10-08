import { registerAs } from '@nestjs/config';
import { intEnv } from './env';

export interface ThrottlerConfig {
    /** Window length in seconds, as written in THROTTLE_TTL. */
    ttl: number;
    /** The same window in milliseconds, which is what @nestjs/throttler expects. */
    ttlMs: number;
    limit: number;
}

export const throttlerConfig = registerAs('throttler', (): ThrottlerConfig => {
    const ttl = intEnv('THROTTLE_TTL', 60);
    return {
        ttl,
        ttlMs: ttl * 1000,
        limit: intEnv('THROTTLE_LIMIT', 10),
    };
});