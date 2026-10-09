import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Resend } from 'resend';
import { maskEmail } from '../../common/utils/format.util';
import type { AppConfig, ResendConfig } from '../../config';
import { RESEND_CLIENT } from './email.constants';
import { renderEmail } from './email.templates';
import { EmailPayloadMap, EmailTemplate } from './email.types';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private readonly from: string;
    private readonly deliveryEnabled: boolean;

    constructor(
        @Inject(RESEND_CLIENT) private readonly resend: Resend,
        configService: ConfigService,
    ) {
        const { fromName, fromEmail } =
            configService.getOrThrow<ResendConfig>('resend');
        this.from = `${fromName} <${fromEmail}>`;
        // Tests render templates but never call the provider.
        this.deliveryEnabled =
            !configService.getOrThrow<AppConfig>('app').isTest;
    }

    /** Sends one email. Throws if the provider rejects it. */
    async send<T extends EmailTemplate>(
        template: T,
        payload: EmailPayloadMap[T],
    ): Promise<void> {
        const { subject, html, text } = renderEmail(template, payload);
        const recipient = maskEmail(payload.to);

        if (!this.deliveryEnabled) {
            this.logger.debug(
                `Skipped "${template}" to ${recipient} (test mode)`,
            );
            return;
        }

        const { data, error } = await this.resend.emails.send({
            from: this.from,
            to: payload.to,
            subject,
            html,
            text,
        });

        if (error) {
            throw new Error(
                `Sending "${template}" to ${recipient} failed: ${error.message}`,
            );
        }
        this.logger.log(`Sent "${template}" to ${recipient} (id: ${data?.id})`);
    }

    /** Like send, but reports failure as `false` and never throws. */
    async trySend<T extends EmailTemplate>(
        template: T,
        payload: EmailPayloadMap[T],
    ): Promise<boolean> {
        try {
            await this.send(template, payload);
            return true;
        } catch (error) {
            this.logger.error(
                error instanceof Error ? error.message : String(error),
            );
            return false;
        }
    }
}
