import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '../../../generated/prisma/enums';

export interface OrganizationSource {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    currency: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MembershipSummary {
    role: MembershipRole;
    joinedAt: Date;
}

export class OrganizationEntity {
    @ApiProperty({ example: '9c2f1a64-1d3b-4a56-8f0e-6a1b2c3d4e5f' })
    id: string;

    @ApiProperty({ example: 'Lagos Fabrics' })
    name: string;

    @ApiProperty({ example: 'lagos-fabrics' })
    slug: string;

    @ApiProperty({ type: String, nullable: true })
    description: string | null;

    @ApiProperty({ type: String, nullable: true })
    logoUrl: string | null;

    @ApiProperty({ type: String, nullable: true })
    website: string | null;

    @ApiProperty({ example: 'NGN', description: 'ISO 4217 currency of all prices' })
    currency: string;

    @ApiProperty({ description: 'User ID of the owner' })
    ownerId: string;

    @ApiProperty({ type: String, format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ type: String, format: 'date-time' })
    updatedAt: Date;

    /** Copies named fields only, so internal columns never leak. */
    constructor(source: OrganizationSource) {
        this.id = source.id;
        this.name = source.name;
        this.slug = source.slug;
        this.description = source.description;
        this.logoUrl = source.logoUrl;
        this.website = source.website;
        this.currency = source.currency;
        this.ownerId = source.ownerId;
        this.createdAt = source.createdAt;
        this.updatedAt = source.updatedAt;
    }
}

/** An organization together with the caller's place in it. */
export class MyOrganizationEntity extends OrganizationEntity {
    @ApiProperty({
        enum: MembershipRole,
        nullable: true,
        description: 'Your role here. Null for platform operators who are not members.',
    })
    role: MembershipRole | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    joinedAt: Date | null;

    constructor(source: OrganizationSource, membership: MembershipSummary | null) {
        super(source);
        this.role = membership?.role ?? null;
        this.joinedAt = membership?.joinedAt ?? null;
    }
}

export class OrganizationDetailEntity extends MyOrganizationEntity {
    @ApiProperty({ example: 4 })
    memberCount: number;

    constructor(
        source: OrganizationSource,
        membership: MembershipSummary | null,
        memberCount: number,
    ) {
        super(source, membership);
        this.memberCount = memberCount;
    }
}