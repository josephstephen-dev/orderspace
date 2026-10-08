import { ApiProperty } from '@nestjs/swagger';

export class NoteAuthorEntity {
    @ApiProperty() id: string;
    @ApiProperty({ example: 'Ada Okafor' }) name: string;
    @ApiProperty({ type: String, nullable: true }) avatarUrl: string | null;
}

export interface OrderNoteSource {
    id: string;
    orderId: string;
    body: string;
    isPinned: boolean;
    isEdited: boolean;
    createdAt: Date;
    updatedAt: Date;
    author: { id: string; name: string; avatarUrl: string | null };
}

export class OrderNoteEntity {
    @ApiProperty() id: string;
    @ApiProperty() orderId: string;
    @ApiProperty({ example: 'Customer asked for delivery before Friday.' }) body: string;
    @ApiProperty({ example: false }) isPinned: boolean;
    @ApiProperty({ example: false, description: 'True once the text has been changed' }) isEdited: boolean;
    @ApiProperty({ type: String, format: 'date-time' }) createdAt: Date;
    @ApiProperty({ type: String, format: 'date-time' }) updatedAt: Date;
    @ApiProperty({ type: NoteAuthorEntity }) author: NoteAuthorEntity;

    constructor(source: OrderNoteSource) {
        this.id = source.id;
        this.orderId = source.orderId;
        this.body = source.body;
        this.isPinned = source.isPinned;
        this.isEdited = source.isEdited;
        this.createdAt = source.createdAt;
        this.updatedAt = source.updatedAt;
        this.author = {
            id: source.author.id,
            name: source.author.name,
            avatarUrl: source.author.avatarUrl,
        };
    }
}