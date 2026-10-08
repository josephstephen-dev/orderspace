import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { createRouteHandler } from 'uploadthing/express';
import type { AppConfig } from './config';
import { uploadRouter } from './modules/attachments/upload.router';

const API_VERSION = '0.1.0';

/**
 * Everything that makes the app behave like the real API. main.ts calls it,
 * and so should every end-to-end test, so tests exercise the same pipeline.
 */
export function configureApp(app: NestExpressApplication): void {
    const { corsOrigins, globalPrefix, isProduction } = app
        .get(ConfigService)
        .getOrThrow<AppConfig>('app');

    // Behind one reverse proxy or load balancer, trust its forwarded address.
    // Without this every client shares the proxy's IP, and so does the rate
    // limiter. Remove this line if the container is exposed directly.
    if (isProduction) app.set('trust proxy', 1);

    app.setGlobalPrefix(globalPrefix);
    app.use(helmet());
    app.enableCors({
        origin: corsOrigins.length > 0 ? corsOrigins : false,
        credentials: true,
    });

    // Query values are converted by explicit @Type() and Transform helpers,
    // not by implicit conversion, which would turn the string "false" into true.
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Lets SIGTERM from Docker close the database pool cleanly.
    app.enableShutdownHooks();

    // UploadThing runs as Express middleware, outside Nest's guards and filters.
    app.use(
        `/${globalPrefix}/uploadthing`,
        createRouteHandler({ router: uploadRouter }),
    );
}

export function setupSwagger(app: INestApplication): void {
    const { globalPrefix, docsPath } = app
        .get(ConfigService)
        .getOrThrow<AppConfig>('app');

    const builder = new DocumentBuilder()
        .setTitle('Orderspace API')
        .setDescription(
            'Multi-tenant order management. Every business record belongs to an organization, and access is checked on every request.',
        )
        .setVersion(API_VERSION)
        .addBearerAuth(
            { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
            'access-token',
        );

    for (const tag of [
        'Authentication',
        'Organizations',
        'Members',
        'Invitations',
        'Categories',
        'Products',
        'Inventory',
        'Customers',
        'Orders',
        'Order Notes',
        'Attachments',
        'Notifications',
        'Audit Log',
        'Health',
    ]) {
        builder.addTag(tag);
    }

    const document = SwaggerModule.createDocument(app, builder.build());
    SwaggerModule.setup(`${globalPrefix}/${docsPath}`, app, document, {
        customSiteTitle: 'Orderspace API',
        swaggerOptions: { persistAuthorization: true, docExpansion: 'none' },
    });
}