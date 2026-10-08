export interface Page<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
}

interface PageQuery {
    page: number;
    limit: number;
}

/** Prisma `skip` and `take` for a page query. */
export function pageArgs({ page, limit }: PageQuery) {
    return { skip: (page - 1) * limit, take: limit };
}

/** The response shape every list endpoint returns. */
export function toPage<T>(
    items: T[],
    total: number,
    { page, limit }: PageQuery,
): Page<T> {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        items,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
    };
}