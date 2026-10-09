import { JwtService } from '@nestjs/jwt';
import { createUploadthing } from 'uploadthing/express';
import type { FileRouter } from 'uploadthing/express';
import { UploadThingError } from 'uploadthing/server';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { requireEnv } from '../../config/env';

const f = createUploadthing();

let verifier: JwtService | undefined;

/** Created on first use, so the environment is fully loaded by then. */
function getVerifier(): JwtService {
    verifier ??= new JwtService({
        secret: requireEnv('JWT_SECRET'),
        verifyOptions: { algorithms: ['HS256'] },
    });
    return verifier;
}

/**
 * Mounted outside Nest at /api/uploadthing, so Nest's guards do not run here.
 * This route checks the access token itself. Membership is checked later, when
 * the file is attached to an order.
 */
export const uploadRouter: FileRouter = {
    orderAttachment: f({
        image: { maxFileSize: '8MB', maxFileCount: 5 },
        pdf: { maxFileSize: '16MB', maxFileCount: 3 },
        text: { maxFileSize: '2MB', maxFileCount: 3 },
    })
        .middleware(async ({ req }) => {
            const [type, token] = req.headers.authorization?.split(' ') ?? [];
            if (type?.toLowerCase() !== 'bearer' || !token) {
                throw new UploadThingError('Unauthorized');
            }

            try {
                const payload = await getVerifier().verifyAsync<JwtPayload>(token);
                if (!payload.sub) throw new Error('Token has no subject');
                return { userId: payload.sub };
            } catch {
                throw new UploadThingError('Unauthorized');
            }
        })
        .onUploadComplete(({ metadata, file }) => ({
            uploadedBy: metadata.userId,
            url: file.ufsUrl,
            key: file.key,
            name: file.name,
            size: file.size,
            type: file.type,
        })),
};

export type OrderspaceFileRouter = typeof uploadRouter;