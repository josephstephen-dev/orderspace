import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseEntity } from './message-response.entity';
import { UserEntity } from './user.entity';

export class RegisterResponseEntity extends MessageResponseEntity {
    @ApiProperty({ type: UserEntity })
    user: UserEntity;
}
