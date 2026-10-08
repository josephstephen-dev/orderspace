import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { trimText } from '../../../common/utils/transform.util';
import { MAX_NOTE_LENGTH } from './create-order-note.dto';

export class UpdateOrderNoteDto {
    @ApiPropertyOptional({
        maxLength: MAX_NOTE_LENGTH,
        description: 'Only the author can change the text.',
    })
    @IsOptional()
    @Transform(({ value }) => trimText(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_NOTE_LENGTH)
    body?: string;

    @ApiPropertyOptional({ description: 'Any member with note access can pin or unpin.' })
    @IsOptional()
    @IsBoolean()
    isPinned?: boolean;
}