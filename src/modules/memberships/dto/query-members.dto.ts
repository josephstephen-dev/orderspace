import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';
import { trimText } from '../../../common/utils/transform.util';
import { MembershipRole } from '../../../generated/prisma/enums';

export class QueryMembersDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: MembershipRole })
    @IsOptional()
    @IsEnum(MembershipRole)
    role?: MembershipRole;

    @ApiPropertyOptional({ description: 'Matches name or email' })
    @IsOptional()
    @Transform(({ value }) => trimText(value))
    @IsString()
    @MaxLength(100)
    search?: string;
}