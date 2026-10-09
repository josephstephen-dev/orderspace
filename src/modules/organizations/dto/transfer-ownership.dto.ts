import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
    @ApiProperty({
        description: 'User ID of the new owner. They must already be a member.',
    })
    @IsUUID()
    newOwnerId: string;
}
