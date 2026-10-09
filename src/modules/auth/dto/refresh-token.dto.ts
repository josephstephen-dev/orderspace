import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({ description: 'The refresh token issued at login' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    refreshToken: string;
}
