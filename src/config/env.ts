export function requireEnv(key: string): string {
    const value = process.env[key]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

/** Empty values count as unset, so `KEY=` in .env falls back to the default. */
export function optionalEnv(key: string, fallback: string): string {
    return process.env[key]?.trim() || fallback;
}

export function intEnv(
    key: string,
    fallback: number,
    { min = 1, max = Number.MAX_SAFE_INTEGER } = {},
): number {
    const raw = process.env[key]?.trim();
    if (!raw) return fallback;

    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(
            `Environment variable ${key} must be an integer between ${min} and ${max}, received "${raw}"`,
        );
    }
    return value;
}

const DURATION_PATTERN = /^(\d+)([smhd])$/;
const DURATION_UNIT_MS = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
} as const;

/** A duration such as 15m, 12h or 7d. Anything else fails at startup. */
export function durationEnv(key: string, fallback: string): string {
    const value = optionalEnv(key, fallback);
    if (!DURATION_PATTERN.test(value)) {
        throw new Error(
            `Environment variable ${key} must look like 15m, 12h or 7d, received "${value}"`,
        );
    }
    return value;
}

export function durationToMs(value: string): number {
    const match = DURATION_PATTERN.exec(value);
    if (!match) {
        throw new Error(`Invalid duration "${value}"`);
    }
    const unit = match[2] as keyof typeof DURATION_UNIT_MS;
    return Number(match[1]) * DURATION_UNIT_MS[unit];
}