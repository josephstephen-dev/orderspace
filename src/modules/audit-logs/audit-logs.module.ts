import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from '../../common/interceptors';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';

@Module({
    controllers: [AuditLogsController],
    providers: [
        AuditLogsService,
        { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    ],
    exports: [AuditLogsService],
})
export class AuditLogsModule {}