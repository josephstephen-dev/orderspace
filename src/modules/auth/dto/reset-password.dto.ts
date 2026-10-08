import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { NormalizedEmail, StrongPassword } from '../../../common/decorators';

export class ResetPasswordDto {
    @ApiProperty({ example: 'ada@example.com' })
    @NormalizedEmail()
    email: string;

    @ApiProperty({ example: '483920', description: '6-digit code from the email' })
    @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
    code: string;

    @ApiProperty({ example: 'An0ther-Str0ng-One', minLength: 8, maxLength: 72 })
    @StrongPassword()
    newPassword: string;
}