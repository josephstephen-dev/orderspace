import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { StrongPassword } from '../../../common/decorators';

export class ChangePasswordDto {
    @ApiProperty({ example: 'S3cure-Passw0rd!' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(72)
    currentPassword: string;

    @ApiProperty({ example: 'An0ther-Str0ng-One', minLength: 8, maxLength: 72 })
    @StrongPassword()
    newPassword: string;
}
