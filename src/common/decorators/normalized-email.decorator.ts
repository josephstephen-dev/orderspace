import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';
import { normalizeEmail } from '../utils/transform.util';

/** Validates an email address and stores it trimmed and lowercased. */
export function NormalizedEmail() {
    return applyDecorators(
        Transform(({ value }) => normalizeEmail(value)),
        IsEmail(),
        MaxLength(254),
    );
}