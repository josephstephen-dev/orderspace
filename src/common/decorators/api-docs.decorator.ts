import { applyDecorators, Type } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiExtraModels,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiUnauthorizedResponse,
    getSchemaPath,
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

/** Documents the shared page shape returned by every list endpoint. */
export const ApiPageResponse = (model: Type<unknown>) =>
    applyDecorators(
        ApiExtraModels(model),
        ApiOkResponse({
            schema: {
                type: 'object',
                properties: {
                    items: {
                        type: 'array',
                        items: { $ref: getSchemaPath(model) },
                    },
                    total: { type: 'number', example: 42 },
                    page: { type: 'number', example: 1 },
                    limit: { type: 'number', example: 25 },
                    totalPages: { type: 'number', example: 2 },
                    hasNextPage: { type: 'boolean', example: true },
                },
            },
        }),
    );