import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';
import { NormalizedEmail } from '../../../common/decorators';

export class VerifyEmailDto {
    @ApiProperty({ example: 'ada@example.com' })
    @NormalizedEmail()
    email: string;

    @ApiProperty({ example: '483920', description: '6-digit code from the email' })
    @Matches(/^\d{6}$/, { message: 'code must be exactly 6 digits' })
    code: string;
}