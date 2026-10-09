import { ApiProperty } from '@nestjs/swagger';
import { NormalizedEmail } from '../../../common/decorators';

export class ForgotPasswordDto {
    @ApiProperty({ example: 'ada@example.com' })
    @NormalizedEmail()
    email: string;
}
