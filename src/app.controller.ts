import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
    ApiOkResponse,
    ApiOperation,
    ApiServiceUnavailableResponse,
    ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthEntity } from './app.entities';
import { AppService } from './app.service';
import { Public } from './common/decorators';

@ApiTags('Health')
@SkipThrottle()
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    @Get()
    @Public()
    @ApiOperation({
        summary: 'Health check',
        description:
            'Returns 200 when the API and its database are reachable and 503 otherwise, so the Docker health check and load balancers can act on it. HEAD works too.',
    })
    @ApiOkResponse({ type: HealthEntity })
    @ApiServiceUnavailableResponse({ description: 'A dependency is down' })
    async getHealth(): Promise<HealthEntity> {
        const report = await this.appService.getHealth();
        if (report.status === 'unhealthy') {
            const down = Object.entries(report.checks)
                .filter(([, check]) => check.status === 'down')
                .map(([name]) => name);
            throw new ServiceUnavailableException(
                `Unhealthy: ${down.join(', ')}`,
            );
        }
        return report;
    }
}
