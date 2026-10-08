import { registerAs } from '@nestjs/config';
import { intEnv, optionalEnv } from './env';

const NODE_ENVS = ['development', 'production', 'test'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];

export interface AppConfig {
    name: string;
    port: number;
    env: NodeEnv;
    isProduction: boolean;
    isDevelopment: boolean;
    isTest: boolean;
    corsOrigins: string[];
    globalPrefix: string;
    docsPath: string;
}

function parseNodeEnv(value: string): NodeEnv {
    if (!(NODE_ENVS as readonly string[]).includes(value)) {
        throw new Error(
            `NODE_ENV must be one of ${NODE_ENVS.join(', ')}, received "${value}"`,
        );
    }
    return value as NodeEnv;
}

function parseOrigins(raw: string): string[] {
    return raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
        .map((origin) => {
            try {
                return new URL(origin).origin;
            } catch {
                throw new Error(
                    `CORS_ORIGINS contains an invalid origin: "${origin}"`,
                );
            }
        });
}

export const appConfig = registerAs('app', (): AppConfig => {
    const env = parseNodeEnv(optionalEnv('NODE_ENV', 'development'));
    return {
        name: optionalEnv('APP_NAME', 'orderspace'),
        port: intEnv('PORT', 3000, { max: 65535 }),
        env,
        isProduction: env === 'production',
        isDevelopment: env === 'development',
        isTest: env === 'test',
        corsOrigins: parseOrigins(optionalEnv('CORS_ORIGINS', '')),
        globalPrefix: 'api',
        docsPath: 'docs',
    };
});