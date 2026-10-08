import { SetMetadata } from '@nestjs/common';
import type { AuditAction } from '../../generated/prisma/enums';

export const AUDIT_LOG_KEY = 'auditLog';

/** Entities that can appear in the audit log. */
export const AUDIT_ENTITIES = [
    'User',
    'Organization',
    'Membership',
    'Invitation',
    'Category',
    'Product',
    'InventoryAdjustment',
    'Customer',
    'Order',
    'OrderNote',
    'Attachment',
] as const;

export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export interface AuditLogOptions {
    /** Which kind of record the route changes. */
    entity: AuditEntity;
    /** Defaults to the action implied by the HTTP method. */
    action?: AuditAction;
    /** Route parameter holding the record ID. Defaults to "id". */
    idParam?: string;
}

/**
 * Marks a route for audit logging. The AuditLogInterceptor only records
 * routes that carry this decorator.
 */
export const AuditLog = (options: AuditLogOptions) =>
    SetMetadata(AUDIT_LOG_KEY, options);