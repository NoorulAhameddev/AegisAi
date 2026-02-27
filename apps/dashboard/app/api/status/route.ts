import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const dashboardDir = path.join(process.cwd(), '.dashboard');

export async function GET() {
  const queueMode = process.env.QUEUE_MODE || 'local';

  // git info
  let branch = 'unknown';
  let uncommitted = 0;
  try {
    branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: process.cwd() }).toString().trim();
    const status = execSync('git status --porcelain', { cwd: process.cwd() }).toString().trim();
    uncommitted = status ? status.split(/\r?\n/).length : 0;
  } catch (e) { /* ignore */ }

  // job metrics
  let success = 0, failed = 0, queued = 0;
  try {
    const files = await fs.readdir(path.join(dashboardDir, 'jobs')).catch(() => []);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(await fs.readFile(path.join(dashboardDir, 'jobs', f), 'utf8'));
        if (j.status === 'succeeded') success++;
        else if (j.status === 'failed') failed++;
        else if (j.status === 'queued') queued++;
      } catch (e) { }
    }
  } catch (e) { }

  // last audit timestamp
  let lastAudit = null;
  try {
    const raw = await fs.readFile(path.join(dashboardDir, 'vulnerabilities.json'), 'utf8').catch(() => null);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.metadata && parsed.metadata.generated) lastAudit = parsed.metadata.generated;
      else lastAudit = parsed.auditReportVersion ? Date.now() : null;
    }
  } catch (e) { }

  return NextResponse.json({ branch, uncommitted, queueMode, jobs: { success, failed, queued }, lastAudit });
}
