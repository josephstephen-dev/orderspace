import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto';
import { toBoolean } from '../../../common/utils/transform.util';
import { NotificationType } from '../../../generated/prisma/enums';

export class QueryNotificationsDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Only read or only unread notifications' })
    @IsOptional()
    @Transform(({ value }) => toBoolean(value))
    @IsBoolean()
    isRead?: boolean;

    @ApiPropertyOptional({ enum: NotificationType })
    @IsOptional()
    @IsEnum(NotificationType)
    type?: NotificationType;
}