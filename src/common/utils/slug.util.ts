export const MAX_SLUG_LENGTH = 50;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Lagos Fabrics & Co." becomes "lagos-fabrics-co". Returns "" if nothing usable is left. */
export function slugify(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/g, '');
}