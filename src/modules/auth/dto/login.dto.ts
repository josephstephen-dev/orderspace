import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizedEmail } from '../../../common/decorators';

export class LoginDto {
    @ApiProperty({ example: 'ada@example.com' })
    @NormalizedEmail()
    email: string;

    @ApiProperty({ example: 'S3cure-Passw0rd!' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(72)
    password: string;
}
