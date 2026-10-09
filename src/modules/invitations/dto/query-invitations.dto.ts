import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';
import { InvitationStatus } from '../../../generated/prisma/enums';

export class QueryInvitationsDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: InvitationStatus })
    @IsOptional()
    @IsEnum(InvitationStatus)
    status?: InvitationStatus;
}
