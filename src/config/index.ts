import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { jwtConfig } from './jwt.config';
import { resendConfig } from './resend.config';
import { throttlerConfig } from './throttler.config';

export * from './env';
export * from './app.config';
export * from './database.config';
export * from './jwt.config';
export * from './resend.config';
export * from './throttler.config';
export { ConfigModule, ConfigService } from '@nestjs/config';

/** Pass to ConfigModule.forRoot({ load: configurations }). */
export const configurations = [
    appConfig,
    databaseConfig,
    jwtConfig,
    resendConfig,
    throttlerConfig,
];