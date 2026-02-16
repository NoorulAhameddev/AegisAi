import { NextRequest, NextResponse } from 'next/server';
import { getGoogleAuthUrl } from '@/services/auth/google-oauth';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const authUrl = getGoogleAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error('Google OAuth redirect failed', error as Error);
    return NextResponse.redirect('/login?error=oauth_failed');
  }
}
