import { registerAs } from '@nestjs/config';
import { optionalEnv, requireEnv } from './env';

export interface ResendConfig {
    apiKey: string;
    fromEmail: string;
    fromName: string;
}

export const resendConfig = registerAs('resend', (): ResendConfig => ({
    apiKey: requireEnv('RESEND_API_KEY'),
    // Resend's shared sandbox sender. Set RESEND_FROM_EMAIL once your domain is verified.
    fromEmail: optionalEnv('RESEND_FROM_EMAIL', 'onboarding@resend.dev'),
    fromName: optionalEnv('RESEND_FROM_NAME', 'Orderspace'),
}));