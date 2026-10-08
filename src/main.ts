import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp, setupSwagger } from './app.setup';
import type { AppConfig } from './config';

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const { port, env, globalPrefix, docsPath } = app
        .get(ConfigService)
        .getOrThrow<AppConfig>('app');

    configureApp(app);
    setupSwagger(app);

    await app.listen(port);

    const logger = new Logger('Bootstrap');
    logger.log(`Orderspace API listening on port ${port} [${env}]`);
    logger.log(`API docs at /${globalPrefix}/${docsPath}`);
}

bootstrap().catch((error: unknown) => {
    new Logger('Bootstrap').error(
        'Failed to start the application',
        error instanceof Error ? error.stack : String(error),
    );
    process.exit(1);
});