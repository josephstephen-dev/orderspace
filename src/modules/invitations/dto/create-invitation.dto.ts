import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { NormalizedEmail } from '../../../common/decorators';
import { ASSIGNABLE_ROLES } from '../../../common/utils/role.util';
import { MembershipRole } from '../../../generated/prisma/enums';

export class CreateInvitationDto {
    @ApiProperty({ example: 'chioma@example.com' })
    @NormalizedEmail()
    email: string;

    @ApiPropertyOptional({
        enum: ASSIGNABLE_ROLES,
        default: MembershipRole.MEMBER,
        description:
            'Role granted on acceptance. Limited to roles below your own.',
    })
    @IsOptional()
    @IsIn(ASSIGNABLE_ROLES)
    role?: MembershipRole;
}
