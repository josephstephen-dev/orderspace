import { Injectable, Logger } from '@nestjs/common';
import { DatabaseCheckEntity, HealthEntity } from './app.entities';
import { PrismaService } from './database/prisma.service';

const DATABASE_TIMEOUT_MS = 3_000;

@Injectable()
export class AppService {
    private readonly logger = new Logger(AppService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getHealth(): Promise<HealthEntity> {
        const database = await this.checkDatabase();
        return {
            status: database.status === 'up' ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            checks: { database },
        };
    }

    private async checkDatabase(): Promise<DatabaseCheckEntity> {
        const startedAt = Date.now();
        try {
            const latencyMs = await this.withTimeout(
                this.prisma.ping(),
                DATABASE_TIMEOUT_MS,
            );
            return { status: 'up', latencyMs };
        } catch (error) {
            this.logger.error(
                'Database health check failed',
                error instanceof Error ? error.message : String(error),
            );
            return { status: 'down', latencyMs: Date.now() - startedAt };
        }
    }

    /** A hung database must not hang the health check. */
    private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const timeout = new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
                () => reject(new Error(`timed out after ${ms}ms`)),
                ms,
            );
        });
        return Promise.race([promise, timeout]).finally(() =>
            clearTimeout(timer),
        );
    }
}
