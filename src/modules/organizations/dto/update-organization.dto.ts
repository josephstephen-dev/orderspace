import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';

/** Every field is optional. The slug is permanent, so it cannot be updated. */
export class UpdateOrganizationDto extends PartialType(
    OmitType(CreateOrganizationDto, ['slug'] as const),
) {}
