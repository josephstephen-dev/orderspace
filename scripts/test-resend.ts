// Sends a test email through Resend to verify the integration.
// Usage: pnpm test:resend [recipient@example.com]

import 'dotenv/config';
import { Resend } from 'resend';
import { escapeHtml } from '../src/common/utils/html.util';

const DEFAULT_RECIPIENT = 'josephstep486@gmail.com';
// Resend's shared sandbox sender. It only delivers to your own account email.
const SANDBOX_SENDER = 'onboarding@resend.dev';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EmailDetails {
    sentAt: string;
    sender: string;
    recipient: string;
    environment: string;
}

function buildHtml(details: EmailDetails): string {
    const row = (label: string, value: string) => `
        <tr>
            <td style="padding: 8px 0; width: 120px; color: #64748b; font-size: 13px;">${label}</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 13px; font-weight: 600;">${escapeHtml(value)}</td>
        </tr>`;

    return `
<!DOCTYPE html>
<html lang="en">
<body style="margin: 0; padding: 24px 12px; background: #eef3f2; font-family: 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #dbe5e3;">
        <tr>
            <td style="background: #0b1f2a; padding: 28px 32px; border-bottom: 4px solid #14b8a6;">
                <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 3px;">ORDERSPACE</span>
            </td>
        </tr>
        <tr>
            <td style="padding: 32px;">
                <h1 style="margin: 0 0 12px; color: #0f172a; font-size: 22px;">Resend is connected</h1>
                <p style="margin: 0 0 24px; color: #334155; font-size: 15px; line-height: 1.6;">
                    If you are reading this, your Resend credentials and sender
                    settings work, and Orderspace can deliver transactional email.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
                    ${row('Sent at', details.sentAt)}
                    ${row('Sender', details.sender)}
                    ${row('Recipient', details.recipient)}
                    ${row('Environment', details.environment)}
                </table>

                <p style="margin: 28px 0 8px; color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: 1px;">SAMPLE LAYOUT: ORDER CONFIRMATION</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <tr>
                        <td style="padding: 16px; color: #0f172a; font-size: 14px; font-weight: 700;">Order ORD-1042</td>
                        <td style="padding: 16px; text-align: right;">
                            <span style="background: #ccfbf1; color: #0f766e; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px;">CONFIRMED</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 16px 12px; color: #334155; font-size: 14px;">Ankara Fabric 6 yards &times; 10</td>
                        <td style="padding: 0 16px 12px; text-align: right; color: #334155; font-size: 14px;">450.00</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 16px; border-top: 1px solid #e2e8f0; color: #0f172a; font-size: 14px; font-weight: 700;">Total</td>
                        <td style="padding: 12px 16px; border-top: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-size: 14px; font-weight: 700;">450.00</td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr>
            <td style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
                &copy; ${new Date().getFullYear()} Orderspace. All rights reserved.
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function buildText(details: EmailDetails): string {
    return [
        'Orderspace: Resend is connected',
        '',
        'If you are reading this, your Resend credentials and sender settings work.',
        '',
        `Sent at:     ${details.sentAt}`,
        `Sender:      ${details.sender}`,
        `Recipient:   ${details.recipient}`,
        `Environment: ${details.environment}`,
    ].join('\n');
}

async function main(): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.error('RESEND_API_KEY is not set in .env');
        process.exit(1);
    }

    const recipient = (process.argv[2] ?? DEFAULT_RECIPIENT).trim();
    if (!EMAIL_PATTERN.test(recipient)) {
        console.error(`"${recipient}" is not a valid email address`);
        process.exit(1);
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || SANDBOX_SENDER;
    const fromName = process.env.RESEND_FROM_NAME || 'Orderspace';
    const sender = `${fromName} <${fromEmail}>`;

    if (fromEmail === SANDBOX_SENDER) {
        console.warn(
            'RESEND_FROM_EMAIL is not set. Using the Resend sandbox sender, which only delivers to your own Resend account email.',
        );
    }

    const details: EmailDetails = {
        sentAt: new Date().toISOString(),
        sender,
        recipient,
        environment: process.env.NODE_ENV ?? 'development',
    };

    console.log(`Sending test email to ${recipient}...`);

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
        from: sender,
        to: recipient,
        subject: 'Orderspace: Resend test email',
        html: buildHtml(details),
        text: buildText(details),
    });

    if (error) {
        console.error('Failed to send email:', error.message);
        process.exit(1);
    }

    console.log('Email sent successfully.');
    console.log('Email ID:', data?.id);
}

main().catch((error: unknown) => {
    console.error('Unexpected error:', error);
    process.exit(1);
});