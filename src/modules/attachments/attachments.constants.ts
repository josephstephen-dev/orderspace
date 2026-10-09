export const MAX_ATTACHMENTS_PER_ORDER = 20;
export const MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024;

/** Images, PDFs and text files only. Matches the UploadThing route below. */
export const ALLOWED_MIME_TYPE =
    /^(image\/[\w.+-]+|application\/pdf|text\/[\w.+-]+)$/;

/** Files uploaded through UploadThing are served from these hosts. */
export function isUploadThingHost(hostname: string): boolean {
    return hostname === 'utfs.io' || hostname.endsWith('.ufs.sh');
}
