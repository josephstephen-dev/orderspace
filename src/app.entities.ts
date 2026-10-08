import { ApiProperty } from '@nestjs/swagger';

export class DatabaseCheckEntity {
    @ApiProperty({ enum: ['up', 'down'], example: 'up' })
    status: 'up' | 'down';

    @ApiProperty({ example: 3, description: 'Round trip to the database in milliseconds' })
    latencyMs: number;
}

export class HealthChecksEntity {
    @ApiProperty({ type: DatabaseCheckEntity })
    database: DatabaseCheckEntity;
}

export class HealthEntity {
    @ApiProperty({ enum: ['healthy', 'unhealthy'], example: 'healthy' })
    status: 'healthy' | 'unhealthy';

    @ApiProperty({ type: String, format: 'date-time' })
    timestamp: string;

    @ApiProperty({ example: 86400, description: 'Seconds since the process started' })
    uptimeSeconds: number;

    @ApiProperty({ type: HealthChecksEntity })
    checks: HealthChecksEntity;
}