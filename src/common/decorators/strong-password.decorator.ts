import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** 8 to 72 characters (bcrypt's limit), with at least one letter and one digit. */
export function StrongPassword() {
    return applyDecorators(
        IsString(),
        MinLength(8),
        MaxLength(72),
        Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
            message: 'password must contain at least one letter and one number',
        }),
    );
}
