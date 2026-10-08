import { ApiProperty } from '@nestjs/swagger';
import { maskEmail } from '../../../common/utils/format.util';
import { InvitationStatus, MembershipRole } from '../../../generated/prisma/enums';

/** A pending invitation past its expiry date reads as EXPIRED right away. */
export function effectiveInvitationStatus(source: {
    status: InvitationStatus;
    expiresAt: Date;
}): InvitationStatus {
    return source.status === InvitationStatus.PENDING &&
        source.expiresAt <= new Date()
        ? InvitationStatus.EXPIRED
        : source.status;
}

export interface InvitationSource {
    id: string;
    email: string;
    organizationId: string;
    role: MembershipRole;
    status: InvitationStatus;
    expiresAt: Date;
    sentById: string;
    acceptedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    organization?: { id: string; name: string; slug: string };
    sentBy?: { id: string; name: string };
}

class InvitationOrganizationEntity {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Lagos Fabrics' }) name: string;
    @ApiProperty({ example: 'lagos-fabrics' }) slug: string;
}

class InvitationSenderEntity {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Ada Okafor' }) name: string;
}

/** Never exposes the token or its hash. */
export class InvitationEntity {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'chioma@example.com' }) email: string;
    @ApiProperty() organizationId: string;
    @ApiProperty({ enum: MembershipRole }) role: MembershipRole;
    @ApiProperty({ enum: InvitationStatus }) status: InvitationStatus;
    @ApiProperty({ type: String, format: 'date-time' }) expiresAt: Date;
    @ApiProperty() sentById: string;
    @ApiProperty({ type: String, format: 'date-time', nullable: true }) acceptedAt: Date | null;
    @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
    @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
    @ApiProperty({ type: InvitationOrganizationEntity, required: false })
    organization?: InvitationOrganizationEntity;
    @ApiProperty({ type: InvitationSenderEntity, required: false })
    sentBy?: InvitationSenderEntity;

    constructor(source: InvitationSource) {
        this.id = source.id;
        this.email = source.email;
        this.organizationId = source.organizationId;
        this.role = source.role;
        this.status = effectiveInvitationStatus(source);
        this.expiresAt = source.expiresAt;
        this.sentById = source.sentById;
        this.acceptedAt = source.acceptedAt;
        this.createdAt = source.createdAt;
        this.updatedAt = source.updatedAt;
        if (source.organization) {
            this.organization = {
                id: source.organization.id,
                name: source.organization.name,
                slug: source.organization.slug,
            };
        }
        if (source.sentBy) {
            this.sentBy = { id: source.sentBy.id, name: source.sentBy.name };
        }
    }
}

/** What the token holder sees before accepting. Reveals as little as needed. */
export class InvitationPreviewEntity {
    @ApiProperty({ type: InvitationOrganizationEntity })
    organization: { name: string; slug: string };

    @ApiProperty({ example: 'Ada Okafor', nullable: true, type: String })
    invitedBy: string | null;

    @ApiProperty({ enum: MembershipRole }) role: MembershipRole;
    @ApiProperty({ enum: InvitationStatus }) status: InvitationStatus;
    @ApiProperty({ type: String, format: 'date-time' }) expiresAt: Date;

    @ApiProperty({
        example: 'ch***@example.com',
        description: 'The address the invitation was sent to, partly hidden',
    })
    emailHint: string;

    constructor(source: InvitationSource) {
        this.organization = {
            name: source.organization?.name ?? '',
            slug: source.organization?.slug ?? '',
        };
        this.invitedBy = source.sentBy?.name ?? null;
        this.role = source.role;
        this.status = effectiveInvitationStatus(source);
        this.expiresAt = source.expiresAt;
        this.emailHint = maskEmail(source.email);
    }
}