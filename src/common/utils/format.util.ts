export function maskEmail(email: string): string {
    return email.replace(/^(.{1,2})[^@]*/, '$1***');
}

/** Order numbers are per organization: ORD-1042. */
export function formatOrderNumber(orderNumber: number): string {
    return `ORD-${orderNumber}`;
}

/** 2026-10-08 09:30 UTC */
export function formatUtc(date: Date): string {
    return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** ADMIN -> Admin, STATUS_CHANGE -> Status Change */
export function toTitleCase(value: string): string {
    return value
        .toLowerCase()
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}