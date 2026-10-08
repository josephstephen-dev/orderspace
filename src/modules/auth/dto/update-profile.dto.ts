import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';
import { trimText } from '../../../common/utils/transform.util';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'Ada Okafor' })
    @IsOptional()
    @Transform(({ value }) => trimText(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: 'https://utfs.io/f/avatar.png' })
    @IsOptional()
    @IsUrl({ require_protocol: true, protocols: ['https'] })
    @MaxLength(2048)
    avatarUrl?: string;
}