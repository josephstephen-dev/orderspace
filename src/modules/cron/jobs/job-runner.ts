import type { Logger } from '@nestjs/common';

/**
 * Runs a scheduled job and logs how long it took. A failing job is logged and
 * never crashes the process. The task returns a short summary for the log.
 */
export async function runJob(
    logger: Logger,
    label: string,
    task: () => Promise<string>,
): Promise<void> {
    const startedAt = Date.now();
    try {
        const summary = await task();
        logger.log(
            `${label} finished in ${Date.now() - startedAt}ms: ${summary}`,
        );
    } catch (error) {
        logger.error(
            `${label} failed after ${Date.now() - startedAt}ms`,
            error instanceof Error ? error.stack : String(error),
        );
    }
}
