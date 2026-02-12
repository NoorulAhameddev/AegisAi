/**
 * List Generated Images
 * GET /api/images
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth } from '@/services/auth/auth';
import { getUserGeneratedImages } from '@/services/ai/image-generation';
import { parseBody } from '@/lib/request-validation';
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/response';
import { logger } from '@/lib/logger';
import { decrypt } from '@/lib/encryption';

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0'));

    const userId = authResult.id;
    const requestId = req.headers.get('x-request-id');

    const images = await getUserGeneratedImages(userId, limit, offset);

    // Decrypt image URLs
    const decryptedImages = await Promise.all(
      images.map(async (img: any) => {
        try {
          const decryptedUrl = await decrypt(img.imageUrl);
          return {
            ...img,
            imageUrl: decryptedUrl,
          };
        } catch (err) {
          logger.error('Failed to decrypt image URL', err as Error, { userId, imageId: img.id });
          return {
            ...img,
            imageUrl: null,
          };
        }
      })
    );

    return successResponse(
      {
        images: decryptedImages,
        count: decryptedImages.length,
        limit,
        offset,
      },
      { requestId }
    );
  } catch (error) {
    logger.error('Failed to fetch images', error as Error);
    return errorResponse('Failed to fetch images', { status: 500 });
  }
}
