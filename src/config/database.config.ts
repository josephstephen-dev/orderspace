import { registerAs } from '@nestjs/config';
import { requireEnv } from './env';

export interface DatabaseConfig {
    url: string;
}

export const databaseConfig = registerAs('database', (): DatabaseConfig => {
    const url = requireEnv('DATABASE_URL');
    if (!/^postgres(ql)?:\/\//.test(url)) {
        throw new Error(
            'DATABASE_URL must be a PostgreSQL connection string (postgresql://...)',
        );
    }
    return { url };
});
