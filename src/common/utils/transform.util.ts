export function normalizeEmail(value: unknown): unknown {
    return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function trimText(value: unknown): unknown {
    return typeof value === 'string' ? value.trim() : value;
}