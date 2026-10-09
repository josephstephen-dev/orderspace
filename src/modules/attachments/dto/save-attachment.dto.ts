import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Length,
    Matches,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { AttachmentSource } from '../../../generated/prisma/enums';
import { trimText } from '../../../common/utils/transform.util';
import {
    ALLOWED_MIME_TYPE,
    MAX_FILE_SIZE_BYTES,
} from '../attachments.constants';

export class SaveAttachmentDto {
    @ApiProperty({ example: 'delivery-proof.pdf' })
    @Transform(({ value }) => trimText(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @Matches(/^[^/\\\0]+$/, {
        message: 'filename must not contain path separators',
    })
    filename: string;

    @ApiProperty({ example: 'application/pdf' })
    @IsString()
    @MaxLength(100)
    @Matches(ALLOWED_MIME_TYPE, {
        message: 'Only images, PDFs and text files can be attached',
    })
    mimeType: string;

    @ApiProperty({ example: 1048576, description: 'Size in bytes' })
    @IsInt()
    @Min(0)
    @Max(MAX_FILE_SIZE_BYTES)
    size: number;

    @ApiProperty({ example: 'https://abc123.ufs.sh/f/xyz789' })
    @IsUrl({ require_protocol: true, protocols: ['https'] })
    @MaxLength(2048)
    url: string;

    @ApiPropertyOptional({
        example: 'xyz789',
        description:
            'The UploadThing file key. Required for uploads, not allowed for links.',
    })
    @IsOptional()
    @IsString()
    @Length(8, 512)
    fileKey?: string;

    @ApiPropertyOptional({
        enum: AttachmentSource,
        default: AttachmentSource.UPLOAD,
    })
    @IsOptional()
    @IsEnum(AttachmentSource)
    source?: AttachmentSource;
}
