import { ApiProperty } from '@nestjs/swagger';
import { AttachmentSource } from '../../../generated/prisma/enums';

export class AttachmentUploaderEntity {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Ada Okafor' }) name: string;
}

export interface AttachmentSourceRecord {
    id: string;
    orderId: string;
    filename: string;
    mimeType: string;
    size: number;
    url: string;
    source: AttachmentSource;
    uploadedById: string | null;
    createdAt: Date;
    uploadedBy?: { id: string; name: string } | null;
}

export class AttachmentEntity {
    @ApiProperty() id: string;
    @ApiProperty() orderId: string;
    @ApiProperty({ example: 'delivery-proof.pdf' }) filename: string;
    @ApiProperty({ example: 'application/pdf' }) mimeType: string;
    @ApiProperty({ example: 1048576 }) size: number;
    @ApiProperty({ example: 'https://abc123.ufs.sh/f/xyz789' }) url: string;
    @ApiProperty({ enum: AttachmentSource }) source: AttachmentSource;
    @ApiProperty({ type: String, nullable: true }) uploadedById: string | null;
    @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
    @ApiProperty({ type: AttachmentUploaderEntity, nullable: true })
    uploadedBy: AttachmentUploaderEntity | null;

    /** The storage key is internal and never returned. */
    constructor(source: AttachmentSourceRecord) {
        this.id = source.id;
        this.orderId = source.orderId;
        this.filename = source.filename;
        this.mimeType = source.mimeType;
        this.size = source.size;
        this.url = source.url;
        this.source = source.source;
        this.uploadedById = source.uploadedById;
        this.createdAt = source.createdAt;
        this.uploadedBy = source.uploadedBy
            ? { id: source.uploadedBy.id, name: source.uploadedBy.name }
            : null;
    }
}