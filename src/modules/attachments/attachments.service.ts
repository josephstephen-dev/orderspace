import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UTApi } from 'uploadthing/server';
import type { ActingMember } from '../../common/interfaces/acting-member.interface';
import { isUniqueViolation } from '../../common/utils/prisma-error.util';
import { hasMinimumRole } from '../../common/utils/role.util';
import type { AppConfig } from '../../config';
import { PrismaService } from '../../database/prisma.service';
import { AttachmentSource, MembershipRole } from '../../generated/prisma/enums';
import {
    MAX_ATTACHMENTS_PER_ORDER,
    isUploadThingHost,
} from './attachments.constants';
import { SaveAttachmentDto } from './dto';
import { AttachmentEntity } from './entities';

const UPLOADER_INCLUDE = {
    uploadedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class AttachmentsService {
    private readonly logger = new Logger(AttachmentsService.name);
    private readonly cdnEnabled: boolean;
    private utapi?: UTApi;

    constructor(
        private readonly prisma: PrismaService,
        configService: ConfigService,
    ) {
        this.cdnEnabled = !configService.getOrThrow<AppConfig>('app').isTest;
    }

    /** Bounded to 20 per order, so this is a plain list rather than a page. */
    async findAll(orderId: string) {
        await this.requireOrder(orderId);
        const items = await this.prisma.attachment.findMany({
            where: { orderId },
            include: UPLOADER_INCLUDE,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        });
        return items.map((item) => new AttachmentEntity(item));
    }

    async save(orderId: string, userId: string, dto: SaveAttachmentDto) {
        const order = await this.requireOrder(orderId);

        const source = dto.source ?? AttachmentSource.UPLOAD;
        this.assertSourceIsConsistent(dto, source);

        const count = await this.prisma.attachment.count({
            where: { orderId },
        });
        if (count >= MAX_ATTACHMENTS_PER_ORDER) {
            throw new ConflictException(
                `An order can have at most ${MAX_ATTACHMENTS_PER_ORDER} attachments`,
            );
        }

        try {
            const created = await this.prisma.attachment.create({
                data: {
                    organizationId: order.organizationId,
                    orderId,
                    uploadedById: userId,
                    filename: dto.filename,
                    mimeType: dto.mimeType,
                    size: dto.size,
                    url: dto.url,
                    fileKey: dto.fileKey ?? null,
                    source,
                },
                include: UPLOADER_INCLUDE,
            });
            return new AttachmentEntity(created);
        } catch (error) {
            // fileKey is unique, so one stored file belongs to one attachment.
            if (isUniqueViolation(error)) {
                throw new ConflictException('This file is already attached');
            }
            throw error;
        }
    }

    /** The uploader or an admin. Uploaded files are also removed from UploadThing. */
    async remove(orderId: string, attachmentId: string, actor: ActingMember) {
        const attachment = await this.prisma.attachment.findFirst({
            where: { id: attachmentId, orderId, order: { deletedAt: null } },
        });
        if (!attachment) throw new NotFoundException('Attachment not found');

        const isUploader = attachment.uploadedById === actor.userId;
        if (
            !isUploader &&
            !hasMinimumRole(actor.role, [MembershipRole.ADMIN])
        ) {
            throw new ForbiddenException(
                'Only the uploader or an admin can remove an attachment',
            );
        }

        await this.prisma.attachment.delete({ where: { id: attachmentId } });

        if (
            attachment.source === AttachmentSource.UPLOAD &&
            attachment.fileKey
        ) {
            await this.deleteFromCdn(attachment.fileKey);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private async requireOrder(
        orderId: string,
    ): Promise<{ id: string; organizationId: string }> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, deletedAt: null },
            select: { id: true, organizationId: true },
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    /**
     * An uploaded attachment must point at an UploadThing file whose key matches
     * its URL. Without this, someone could register another file's key and then
     * delete that file from storage by deleting the attachment.
     */
    private assertSourceIsConsistent(
        dto: SaveAttachmentDto,
        source: AttachmentSource,
    ): void {
        if (source === AttachmentSource.URL) {
            if (dto.fileKey) {
                throw new BadRequestException(
                    'fileKey is only valid for uploaded files',
                );
            }
            return;
        }

        if (!dto.fileKey) {
            throw new BadRequestException(
                'fileKey is required for uploaded files',
            );
        }
        let url: URL;
        try {
            url = new URL(dto.url);
        } catch {
            throw new BadRequestException('url is not valid');
        }
        const keyInUrl = url.pathname.split('/').pop();
        if (!isUploadThingHost(url.hostname) || keyInUrl !== dto.fileKey) {
            throw new BadRequestException(
                'The URL does not match an UploadThing file with this key',
            );
        }
    }

    /** Best effort: the attachment is already gone, so a failure only leaves an orphan. */
    private async deleteFromCdn(fileKey: string): Promise<void> {
        if (!this.cdnEnabled) return;
        try {
            this.utapi ??= new UTApi();
            await this.utapi.deleteFiles(fileKey);
        } catch (error) {
            this.logger.warn(
                `Could not delete ${fileKey} from UploadThing: ${String(error)}`,
            );
        }
    }
}
