import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/services/auth/google-oauth';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
  try {
    if (!env.ENABLE_GOOGLE_OAUTH) {
      return NextResponse.redirect('/login?error=oauth_disabled');
    }
    const authUrl = getGoogleAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error('Google OAuth redirect failed', error as Error);
    return NextResponse.redirect('/login?error=oauth_failed');
  }
}
