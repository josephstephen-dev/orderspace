import { ApiProperty } from '@nestjs/swagger';
import { NormalizedEmail } from '../../../common/decorators';

export class ResendOtpDto {
    @ApiProperty({ example: 'ada@example.com' })
    @NormalizedEmail()
    email: string;
}