import { applyDecorators } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiForbiddenResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/** Bearer authentication plus the standard 401 response. */
export const ApiAuth = () =>
    applyDecorators(
        ApiBearerAuth('access-token'),
        ApiUnauthorizedResponse({
            description: 'Missing, invalid or expired access token',
        }),
    );

/** ApiAuth plus the 403 returned by the organization guards. */
export const ApiOrgAccess = () =>
    applyDecorators(
        ApiAuth(),
        ApiForbiddenResponse({
            description: 'Not a member of this organization, or role too low',
        }),
    );