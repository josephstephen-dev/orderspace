import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { ResendConfig } from '../../config';
import { RESEND_CLIENT } from './email.constants';
import { EmailService } from './email.service';

@Global()
@Module({
    providers: [
        {
            provide: RESEND_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) =>
                new Resend(config.getOrThrow<ResendConfig>('resend').apiKey),
        },
        EmailService,
    ],
    exports: [EmailService],
})
export class EmailModule {}