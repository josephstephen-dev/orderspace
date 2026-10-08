import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters';
import { JwtAuthGuard } from './common/guards';
import { TransformInterceptor } from './common/interceptors';
import {
    JwtConfig,
    ThrottlerConfig,
    configurations,
    durationToMs,
} from './config';
import { PrismaModule } from './database/prisma.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { CronModule } from './modules/cron/cron.module';
import { EmailModule } from './modules/email/email.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrderNotesModule } from './modules/order-notes/order-notes.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            load: configurations,
            cache: true,
        }),
        JwtModule.registerAsync({
            global: true,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const jwt = config.getOrThrow<JwtConfig>('jwt');
                return {
                    secret: jwt.secret,
                    signOptions: {
                        algorithm: 'HS256',
                        expiresIn: Math.floor(durationToMs(jwt.accessExpiresIn) / 1000),
                    },
                    verifyOptions: { algorithms: ['HS256'] },
                };
            },
        }),
        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                const { ttlMs, limit } = config.getOrThrow<ThrottlerConfig>('throttler');
                return [{ ttl: ttlMs, limit }];
            },
        }),
        PrismaModule,
        EmailModule,
        AuthModule,
        OrganizationsModule,
        MembershipsModule,
        InvitationsModule,
        OrderNotesModule,
        AttachmentsModule,
        NotificationsModule,
        AuditLogsModule,
        CronModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Order matters: rate limiting runs before authentication work.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    ],
})
export class AppModule {}