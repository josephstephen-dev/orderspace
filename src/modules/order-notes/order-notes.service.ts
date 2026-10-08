import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import type { PaginationQueryDto } from '../common/dto';
import type { ActingMember } from '../common/interfaces/acting-member.interface';
import { formatOrderNumber } from '../common/utils/format.util';
import { pageArgs, toPage } from '../common/utils/pagination.util';
import { hasMinimumRole } from '../common/utils/role.util';
import { PrismaService } from '../database/prisma.service';
import { MembershipRole, NotificationType } from '../generated/prisma/enums';
import { NotificationsService } from 'notifications/notifications.service';
import { CreateOrderNoteDto, UpdateOrderNoteDto } from './dto';
import { OrderNoteEntity } from './entities';

const AUTHOR_SELECT = { id: true, name: true, avatarUrl: true } as const;
const MAX_NOTIFIED_PEOPLE = 20;
const PREVIEW_LENGTH = 140;

interface NoteOrder {
    id: string;
    organizationId: string;
    orderNumber: number;
    createdById: string | null;
}

@Injectable()
export class OrderNotesService {
    private readonly logger = new Logger(OrderNotesService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) {}

    async findAll(organizationId: string, orderId: string, query: PaginationQueryDto) {
        await this.requireOrder(organizationId, orderId);

        const where = { orderId };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.orderNote.findMany({
                where,
                include: { author: { select: AUTHOR_SELECT } },
                orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
                ...pageArgs(query),
            }),
            this.prisma.orderNote.count({ where }),
        ]);

        return toPage(
            items.map((item) => new OrderNoteEntity(item)),
            total,
            query,
        );
    }

    async create(
        organizationId: string,
        orderId: string,
        authorId: string,
        dto: CreateOrderNoteDto,
    ) {
        const order = await this.requireOrder(organizationId, orderId);

        const note = await this.prisma.orderNote.create({
            data: {
                orderId,
                authorId,
                body: dto.body,
                isPinned: dto.isPinned ?? false,
            },
            include: { author: { select: AUTHOR_SELECT } },
        });

        void this.notifyParticipants(order, note.id, note.body, authorId);
        return new OrderNoteEntity(note);
    }

    async update(
        organizationId: string,
        orderId: string,
        noteId: string,
        actor: ActingMember,
        dto: UpdateOrderNoteDto,
    ) {
        await this.requireOrder(organizationId, orderId);
        const note = await this.requireNote(orderId, noteId);

        if (dto.body === undefined && dto.isPinned === undefined) {
            throw new BadRequestException('Send a body or isPinned to update');
        }
        if (dto.body !== undefined && note.authorId !== actor.userId) {
            throw new ForbiddenException('Only the author can edit a note');
        }

        const changesText = dto.body !== undefined && dto.body !== note.body;
        const updated = await this.prisma.orderNote.update({
            where: { id: noteId },
            data: {
                body: dto.body,
                isPinned: dto.isPinned,
                isEdited: changesText ? true : undefined,
            },
            include: { author: { select: AUTHOR_SELECT } },
        });
        return new OrderNoteEntity(updated);
    }

    /** The author or an admin can delete. The audit log keeps the original text. */
    async remove(
        organizationId: string,
        orderId: string,
        noteId: string,
        actor: ActingMember,
    ): Promise<void> {
        await this.requireOrder(organizationId, orderId);
        const note = await this.requireNote(orderId, noteId);

        const isAuthor = note.authorId === actor.userId;
        if (!isAuthor && !hasMinimumRole(actor.role, [MembershipRole.ADMIN])) {
            throw new ForbiddenException(
                'You can only delete your own notes unless you are an admin',
            );
        }
        await this.prisma.orderNote.delete({ where: { id: noteId } });
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private async requireOrder(organizationId: string, orderId: string): Promise<NoteOrder> {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, organizationId, deletedAt: null },
            select: {
                id: true,
                organizationId: true,
                orderNumber: true,
                createdById: true,
            },
        });
        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    private async requireNote(orderId: string, noteId: string) {
        const note = await this.prisma.orderNote.findFirst({
            where: { id: noteId, orderId },
            select: { id: true, authorId: true, body: true },
        });
        if (!note) throw new NotFoundException('Note not found');
        return note;
    }

    /** Tells the order's creator and earlier note authors. Never throws. */
    private async notifyParticipants(
        order: NoteOrder,
        noteId: string,
        body: string,
        actorId: string,
    ): Promise<void> {
        try {
            const earlier = await this.prisma.orderNote.findMany({
                where: { orderId: order.id, authorId: { not: actorId } },
                distinct: ['authorId'],
                select: { authorId: true },
                take: MAX_NOTIFIED_PEOPLE,
            });
            const recipients = new Set(earlier.map((note) => note.authorId));
            if (order.createdById && order.createdById !== actorId) {
                recipients.add(order.createdById);
            }
            if (recipients.size === 0) return;

            const preview =
                body.length > PREVIEW_LENGTH
                    ? `${body.slice(0, PREVIEW_LENGTH - 3)}...`
                    : body;

            await this.notificationsService.createAndEmitMany([...recipients], {
                type: NotificationType.ORDER_NOTE_ADDED,
                title: `New note on ${formatOrderNumber(order.orderNumber)}`,
                body: preview,
                resourceType: 'Order',
                resourceId: order.id,
                meta: {
                    organizationId: order.organizationId,
                    orderId: order.id,
                    noteId,
                },
            });
        } catch (error) {
            this.logger.warn(`Note notification failed: ${String(error)}`);
        }
    }
}