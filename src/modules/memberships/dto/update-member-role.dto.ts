import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ASSIGNABLE_ROLES } from '../../../common/utils/role.util';
import { MembershipRole } from '../../../generated/prisma/enums';

export class UpdateMemberRoleDto {
    @ApiProperty({
        enum: ASSIGNABLE_ROLES,
        example: MembershipRole.MEMBER,
        description: 'OWNER cannot be assigned here. Use the transfer endpoint.',
    })
    @IsIn(ASSIGNABLE_ROLES)
    role: MembershipRole;
}