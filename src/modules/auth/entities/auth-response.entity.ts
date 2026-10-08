import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from './user.entity';

export class AuthResponseEntity {
    @ApiProperty({ description: 'Short-lived JWT for the Authorization header' })
    accessToken: string;

    @ApiProperty({ description: 'Single-use token for POST /auth/refresh' })
    refreshToken: string;

    @ApiProperty({ example: 'Bearer' })
    tokenType: 'Bearer';

    @ApiProperty({ example: 900, description: 'Access token lifetime in seconds' })
    expiresIn: number;

    @ApiProperty({ type: UserEntity })
    user: UserEntity;
}