import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseEntity {
    @ApiProperty({ example: 'Password has been reset successfully.' })
    message: string;
}