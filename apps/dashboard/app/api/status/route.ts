import { NextResponse } from 'next/server';

export async function GET() {
  // minimal repo status
  return NextResponse.json({
    repo: 'D:/Aegis-Ai',
    branch: process.env.GIT_BRANCH || 'local',
    uptime: process.uptime()
  });
}
