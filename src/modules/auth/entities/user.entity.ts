import { ApiProperty } from '@nestjs/swagger';
import { GlobalRole } from '../../../generated/prisma/enums';

export class UserEntity {
    @ApiProperty({ example: 'b6f1c0de-2f0e-4c61-9a52-3d1f6a2c9e10' })
    id: string;

    @ApiProperty({ example: 'ada@example.com' })
    email: string;

    @ApiProperty({ example: 'Ada Okafor' })
    name: string;

    @ApiProperty({ type: String, nullable: true, example: null })
    avatarUrl: string | null;

    @ApiProperty({ enum: GlobalRole, example: GlobalRole.USER })
    globalRole: GlobalRole;

    @ApiProperty({ example: true })
    emailVerified: boolean;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    lastSeenAt: Date | null;

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ type: String, format: 'date-time' })
    updatedAt: Date;

    /** Copies only public fields, so the password hash can never leak. */
    constructor(user: UserEntitySource) {
        this.id = user.id;
        this.email = user.email;
        this.name = user.name;
        this.avatarUrl = user.avatarUrl;
        this.globalRole = user.globalRole;
        this.emailVerified = user.emailVerified;
        this.lastSeenAt = user.lastSeenAt;
        this.createdAt = user.createdAt;
        this.updatedAt = user.updatedAt;
    }
}

export type UserEntitySource = Pick<
    UserEntity,
    | 'id'
    | 'email'
    | 'name'
    | 'avatarUrl'
    | 'globalRole'
    | 'emailVerified'
    | 'lastSeenAt'
    | 'createdAt'
    | 'updatedAt'
>;