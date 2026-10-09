import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    MaxLength,
} from 'class-validator';
import { SLUG_PATTERN, MAX_SLUG_LENGTH } from '../../../common/utils/slug.util';
import { trimText } from '../../../common/utils/transform.util';

const HTTPS_ONLY = { require_protocol: true, protocols: ['https'] };

export class CreateOrganizationDto {
    @ApiProperty({ example: 'Lagos Fabrics' })
    @Transform(({ value }) => trimText(value))
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        example: 'lagos-fabrics',
        description:
            'Unique and permanent. Lowercase letters and numbers separated by single hyphens. Generated from the name when omitted.',
    })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_SLUG_LENGTH)
    @Matches(SLUG_PATTERN, {
        message:
            'slug must be lowercase letters and numbers separated by single hyphens',
    })
    slug?: string;

    @ApiPropertyOptional({ example: 'Wholesale textiles from Lagos.' })
    @IsOptional()
    @Transform(({ value }) => trimText(value))
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ example: 'https://utfs.io/f/logo.png' })
    @IsOptional()
    @IsUrl(HTTPS_ONLY)
    @MaxLength(2048)
    logoUrl?: string;

    @ApiPropertyOptional({ example: 'https://lagosfabrics.example' })
    @IsOptional()
    @IsUrl(HTTPS_ONLY)
    @MaxLength(2048)
    website?: string;

    @ApiPropertyOptional({
        example: 'NGN',
        default: 'USD',
        description:
            'ISO 4217 code. Cannot change once the organization has orders.',
    })
    @IsOptional()
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toUpperCase() : value,
    )
    @Matches(/^[A-Z]{3}$/, {
        message: 'currency must be a 3-letter ISO 4217 code',
    })
    currency?: string;
}
