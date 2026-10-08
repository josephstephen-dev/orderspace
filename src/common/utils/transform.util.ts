export function normalizeEmail(value: unknown): unknown {
    return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function trimText(value: unknown): unknown {
    return typeof value === 'string' ? value.trim() : value;
}

/** "true" and "false" from a query string. Anything else is left for validation to reject. */
export function toBoolean(value: unknown): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
}