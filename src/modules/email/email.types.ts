import type { MembershipRole } from '../../generated/prisma/enums';

export enum EmailTemplate {
    EMAIL_VERIFICATION = 'email-verification',
    PASSWORD_RESET_OTP = 'password-reset-otp',
    INVITATION = 'invitation',
    WELCOME = 'welcome',
    ORDER_CONFIRMATION = 'order-confirmation',
    ORDER_SHIPPED = 'order-shipped',
    LOW_STOCK_ALERT = 'low-stock-alert',
}

export interface OrderEmailLine {
    name: string;
    sku: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
}

export interface EmailPayloadMap {
    [EmailTemplate.EMAIL_VERIFICATION]: {
        to: string;
        name: string;
        code: string;
        expiresInMinutes: number;
    };
    [EmailTemplate.PASSWORD_RESET_OTP]: {
        to: string;
        name: string;
        code: string;
        expiresInMinutes: number;
    };
    [EmailTemplate.INVITATION]: {
        to: string;
        organizationName: string;
        inviterName: string;
        role: MembershipRole;
        token: string;
        expiresAt: Date;
    };
    [EmailTemplate.WELCOME]: {
        to: string;
        name: string;
        organizationName: string;
        role: MembershipRole;
    };
    [EmailTemplate.ORDER_CONFIRMATION]: {
        to: string;
        customerName: string;
        organizationName: string;
        orderNumber: number;
        items: OrderEmailLine[];
        subtotal: string;
        total: string;
    };
    [EmailTemplate.ORDER_SHIPPED]: {
        to: string;
        customerName: string;
        organizationName: string;
        orderNumber: number;
        items: Array<{ name: string; quantity: number }>;
        shippedAt: Date;
    };
    [EmailTemplate.LOW_STOCK_ALERT]: {
        to: string;
        name: string;
        organizationName: string;
        totalCount: number;
        products: Array<{
            sku: string;
            name: string;
            stockQuantity: number;
            lowStockThreshold: number;
        }>;
    };
}

export interface RenderedEmail {
    subject: string;
    html: string;
    text: string;
}
