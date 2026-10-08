import { createHash, createHmac, randomBytes } from 'crypto';

/** Generates a URL-safe random token (invitations, refresh tokens). */
export function generateSecureToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
}

/**
 * Hashes a token for storage. Only the hash is saved, so a database leak does
 * not expose usable tokens. Look tokens up by hashing the presented value.
 */
export function hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}

/** Keyed variant of hashToken: a database leak alone cannot verify guesses. */
export function hmacToken(token: string, secret: string): string {
    return createHmac('sha256', secret).update(token).digest('hex');
}