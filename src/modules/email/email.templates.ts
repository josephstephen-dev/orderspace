import {
    APP_NAME,
    appUrl,
    button,
    codeBlock,
    paragraph,
    renderLayout,
    table,
} from './email.layout';
import {
    EmailTemplate,
    type EmailPayloadMap,
    type RenderedEmail,
} from './email.types';

type Renderers = {
    [K in EmailTemplate]: (payload: EmailPayloadMap[K]) => RenderedEmail;
};

const renderers: Renderers = {
    [EmailTemplate.EMAIL_VERIFICATION]: (p) => {
        const subject = `Verify your email for ${APP_NAME}`;
        return {
            subject,
            html: renderLayout({
                title: 'Verify your email',
                preheader: `Your code is ${p.code}`,
                bodyHtml:
                    paragraph(
                        `Hi ${p.name}, use this code to verify your email address:`,
                    ) +
                    codeBlock(p.code) +
                    paragraph(
                        `The code expires in ${p.expiresInMinutes} minutes.`,
                    ),
            }),
            text: `Hi ${p.name},\n\nYour verification code is ${p.code}. It expires in ${p.expiresInMinutes} minutes.`,
        };
    },

    [EmailTemplate.PASSWORD_RESET_OTP]: (p) => ({
        subject: `Reset your ${APP_NAME} password`,
        html: renderLayout({
            title: 'Reset your password',
            preheader: `Your code is ${p.code}`,
            bodyHtml:
                paragraph(
                    `Hi ${p.name}, use this code to reset your password:`,
                ) +
                codeBlock(p.code) +
                paragraph(
                    `The code expires in ${p.expiresInMinutes} minutes. If you did not ask for this, you can ignore this email.`,
                ),
        }),
        text: `Hi ${p.name},\n\nYour password reset code is ${p.code}. It expires in ${p.expiresInMinutes} minutes. If you did not ask for this, ignore this email.`,
    }),

    [EmailTemplate.INVITATION]: (p) => {
        const link = `${appUrl()}/invitations/accept?token=${encodeURIComponent(p.token)}`;
        return {
            subject: `${p.inviterName} invited you to join ${p.organizationName}`,
            html: renderLayout({
                title: `Join ${p.organizationName}`,
                preheader: `${p.inviterName} invited you as ${p.role}`,
                bodyHtml:
                    paragraph(
                        `${p.inviterName} invited you to join ${p.organizationName} as ${p.role}.`,
                    ) +
                    button('Accept invitation', link) +
                    paragraph(
                        `This invitation expires on ${p.expiresAt.toUTCString()}.`,
                    ),
            }),
            text: `${p.inviterName} invited you to join ${p.organizationName} as ${p.role}.\n\nAccept: ${link}\n\nExpires: ${p.expiresAt.toUTCString()}`,
        };
    },

    [EmailTemplate.WELCOME]: (p) => ({
        subject: `Welcome to ${p.organizationName}`,
        html: renderLayout({
            title: `Welcome, ${p.name}`,
            preheader: `You joined ${p.organizationName}`,
            bodyHtml:
                paragraph(
                    `You are now part of ${p.organizationName} as ${p.role}.`,
                ) + button('Open Orderspace', appUrl()),
        }),
        text: `Welcome, ${p.name}. You are now part of ${p.organizationName} as ${p.role}.\n\n${appUrl()}`,
    }),

    [EmailTemplate.ORDER_CONFIRMATION]: (p) => ({
        subject: `Order #${p.orderNumber} confirmed`,
        html: renderLayout({
            title: `Order #${p.orderNumber} confirmed`,
            preheader: `Thanks for your order, ${p.customerName}`,
            bodyHtml:
                paragraph(
                    `Hi ${p.customerName}, ${p.organizationName} received your order.`,
                ) +
                table(
                    ['Item', 'SKU', 'Qty', 'Price', 'Total'],
                    p.items.map((i) => [
                        i.name,
                        i.sku,
                        i.quantity,
                        i.unitPrice,
                        i.lineTotal,
                    ]),
                ) +
                paragraph(`Subtotal: ${p.subtotal}`) +
                paragraph(`Total: ${p.total}`),
        }),
        text: [
            `Hi ${p.customerName}, ${p.organizationName} received your order #${p.orderNumber}.`,
            '',
            ...p.items.map(
                (i) => `${i.quantity} x ${i.name} (${i.sku}) - ${i.lineTotal}`,
            ),
            '',
            `Subtotal: ${p.subtotal}`,
            `Total: ${p.total}`,
        ].join('\n'),
    }),

    [EmailTemplate.ORDER_SHIPPED]: (p) => ({
        subject: `Order #${p.orderNumber} has shipped`,
        html: renderLayout({
            title: `Order #${p.orderNumber} has shipped`,
            preheader: `Shipped ${p.shippedAt.toUTCString()}`,
            bodyHtml:
                paragraph(
                    `Hi ${p.customerName}, your order from ${p.organizationName} shipped on ${p.shippedAt.toUTCString()}.`,
                ) +
                table(
                    ['Item', 'Qty'],
                    p.items.map((i) => [i.name, i.quantity]),
                ),
        }),
        text: [
            `Hi ${p.customerName}, your order #${p.orderNumber} from ${p.organizationName} shipped on ${p.shippedAt.toUTCString()}.`,
            '',
            ...p.items.map((i) => `${i.quantity} x ${i.name}`),
        ].join('\n'),
    }),

    [EmailTemplate.LOW_STOCK_ALERT]: (p) => {
        const more = p.totalCount - p.products.length;
        const moreLine = more > 0 ? `...and ${more} more product(s).` : '';
        return {
            subject: `Low stock alert: ${p.totalCount} product(s) in ${p.organizationName}`,
            html: renderLayout({
                title: 'Low stock alert',
                preheader: `${p.totalCount} product(s) need restocking`,
                bodyHtml:
                    paragraph(
                        `Hi ${p.name}, these products in ${p.organizationName} are at or below their alert level:`,
                    ) +
                    table(
                        ['Product', 'SKU', 'In stock', 'Alert level'],
                        p.products.map((x) => [
                            x.name,
                            x.sku,
                            x.stockQuantity,
                            x.lowStockThreshold,
                        ]),
                    ) +
                    (moreLine ? paragraph(moreLine) : ''),
            }),
            text: [
                `Hi ${p.name}, these products in ${p.organizationName} are low on stock:`,
                '',
                ...p.products.map(
                    (x) =>
                        `${x.name} (${x.sku || 'no SKU'}): ${x.stockQuantity} left, alert level ${x.lowStockThreshold}`,
                ),
                ...(moreLine ? ['', moreLine] : []),
            ].join('\n'),
        };
    },
};

export function renderEmail<T extends EmailTemplate>(
    template: T,
    payload: EmailPayloadMap[T],
): RenderedEmail {
    const render = renderers[template] as unknown as (
        payload: EmailPayloadMap[T],
    ) => RenderedEmail;
    return render(payload);
}
