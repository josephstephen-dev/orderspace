import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '../../../generated/prisma/enums';

export class MemberUserEntity {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Ada Okafor' }) name: string;
    @ApiProperty({ example: 'ada@example.com' }) email: string;
    @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
}

export class MembershipEntity {
    @ApiProperty({ example: 'b6f1c0de-2f0e-4c61-9a52-3d1f6a2c9e10' })
    userId: string;

    @ApiProperty()
    organizationId: string;

    @ApiProperty({ enum: MembershipRole, example: MembershipRole.MEMBER })
    role: MembershipRole;

    @ApiProperty({ type: String, nullable: true, description: 'Who invited this member' })
    invitedById: string | null;

    @ApiProperty({ type: String, format: 'date-time' })
    joinedAt: Date;

    @ApiProperty({ type: MemberUserEntity })
    user: MemberUserEntity;

    constructor(source: MembershipSource) {
        this.userId = source.userId;
        this.organizationId = source.organizationId;
        this.role = source.role;
        this.invitedById = source.invitedById;
        this.joinedAt = source.joinedAt;
        this.user = {
            id: source.user.id,
            name: source.user.name,
            email: source.user.email,
            avatarUrl: source.user.avatarUrl,
        };
    }
}

export interface MembershipSource {
    userId: string;
    organizationId: string;
    role: MembershipRole;
    invitedById: string | null;
    joinedAt: Date;
    user: MemberUserEntity;
}