import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import { trimText } from '../../../common/utils/transform.util';

export const MAX_NOTE_LENGTH = 2000;

export class CreateOrderNoteDto {
    @ApiProperty({
        example: 'Customer asked for delivery before Friday.',
        maxLength: MAX_NOTE_LENGTH,
    })
    @Transform(({ value }) => trimText(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_NOTE_LENGTH)
    body: string;

    @ApiPropertyOptional({
        default: false,
        description: 'Pinned notes are listed first.',
    })
    @IsOptional()
    @IsBoolean()
    isPinned?: boolean;
}
