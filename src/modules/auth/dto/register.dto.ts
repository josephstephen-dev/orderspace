import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { NormalizedEmail, StrongPassword } from '../../../common/decorators';
import { trimText } from '../../../common/utils/transform.util';

export class RegisterDto {
    @ApiProperty({ example: 'ada@example.com' })
    @NormalizedEmail()
    email: string;

    @ApiProperty({
        example: 'S3cure-Passw0rd!',
        minLength: 8,
        maxLength: 72,
        description: 'At least one letter and one number',
    })
    @StrongPassword()
    password: string;

    @ApiProperty({ example: 'Ada Okafor' })
    @Transform(({ value }) => trimText(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;
}
