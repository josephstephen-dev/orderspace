import {
    Injectable,
    Logger,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AppConfig, DatabaseConfig } from '../config';
import { PrismaClient } from '../generated/prisma/client';

const POOL_MAX_CONNECTIONS = 10;
const POOL_IDLE_TIMEOUT_MS = 30_000;
const POOL_CONNECT_TIMEOUT_MS = 10_000;

interface QueryEvent {
    query: string;
    duration: number;
}

interface LogEvent {
    message: string;
}

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy
{
    private readonly logger = new Logger(PrismaService.name);
    private readonly pool: Pool;

    constructor(configService: ConfigService) {
        const { url } = configService.getOrThrow<DatabaseConfig>('database');
        const { isDevelopment } = configService.getOrThrow<AppConfig>('app');

        const pool = new Pool({
            connectionString: url,
            max: POOL_MAX_CONNECTIONS,
            idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
            connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
        });

        super({
            adapter: new PrismaPg(pool),
            log: isDevelopment
                ? [
                      { level: 'query', emit: 'event' },
                      { level: 'warn', emit: 'event' },
                      { level: 'error', emit: 'event' },
                  ]
                : [
                      { level: 'warn', emit: 'event' },
                      { level: 'error', emit: 'event' },
                  ],
        });

        this.pool = pool;

        // An idle client erroring would otherwise crash the process.
        this.pool.on('error', (error) => {
            this.logger.error(`Idle database client error: ${error.message}`);
        });

        if (isDevelopment) {
            this.$on('query' as never, (event: QueryEvent) => {
                this.logger.debug(`${event.duration}ms  ${event.query}`);
            });
        }
        this.$on('warn' as never, (event: LogEvent) => {
            this.logger.warn(event.message);
        });
        this.$on('error' as never, (event: LogEvent) => {
            this.logger.error(event.message);
        });
    }

    async onModuleInit(): Promise<void> {
        try {
            await this.$connect();
            const latency = await this.ping();
            this.logger.log(`Database connected (${latency}ms round trip)`);
        } catch (error) {
            this.logger.error('Failed to connect to the database', error);
            throw error;
        }
    }

    async onModuleDestroy(): Promise<void> {
        try {
            await this.$disconnect();
            if (!this.pool.ended) await this.pool.end();
            this.logger.log('Database connection closed');
        } catch (error) {
            this.logger.error('Error while closing the database', error);
        }
    }

    /** Round-trip time to the database in milliseconds. Used by the health check. */
    async ping(): Promise<number> {
        const startedAt = performance.now();
        await this.$queryRaw`SELECT 1`;
        return Math.round(performance.now() - startedAt);
    }
}
