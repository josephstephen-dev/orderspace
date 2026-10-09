import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 15;
export const OTP_MAX_ATTEMPTS = 5;

const OTP_HASH_ROUNDS = 10;

/** Generates a cryptographically secure numeric code, e.g. "483920". */
export function generateSecureOtp(): string {
    const min = 10 ** (OTP_LENGTH - 1);
    const max = 10 ** OTP_LENGTH;
    return String(randomInt(min, max));
}

export function hashOtp(otp: string): Promise<string> {
    return bcrypt.hash(otp, OTP_HASH_ROUNDS);
}

export function verifyOtp(otp: string, hash: string): Promise<boolean> {
    return bcrypt.compare(otp, hash);
}

export function getOtpExpiryDate(): Date {
    return new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
}
