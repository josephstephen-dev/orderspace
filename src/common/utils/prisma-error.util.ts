/** True for a unique-constraint violation. Detected by shape, so no client import is needed. */
export function isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const candidate = error as { name?: unknown; code?: unknown };
    return (
        candidate.name === 'PrismaClientKnownRequestError' &&
        candidate.code === 'P2002'
    );
}
