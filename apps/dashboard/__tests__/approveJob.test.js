const fs = require('fs').promises;
const path = require('path');
const { createJob, approveJob } = require('../lib/jobsApi');

const jobsDir = path.join(process.cwd(), '.dashboard', 'jobs');

describe('approveJob helper', () => {
  beforeEach(async () => {
    await fs.mkdir(jobsDir, { recursive: true });
  });

  afterEach(async () => {
    const files = await fs.readdir(jobsDir).catch(() => []);
    for (const f of files) {
      await fs.unlink(path.join(jobsDir, f)).catch(() => {});
    }
  });

  test('approves a pending-approval job and appends log', async () => {
    const job = await createJob({ type: 'dependency-upgrade' });

    const jobPath = path.join(jobsDir, job.id + '.json');
    const raw = JSON.parse(await fs.readFile(jobPath, 'utf8'));
    raw.status = 'pending-approval';
    await fs.writeFile(jobPath, JSON.stringify(raw, null, 2), 'utf8');

    const res = await approveJob(job.id);
    expect(res).not.toBeNull();
    expect(res.approved).toBe(true);
    expect(res.status).toBe('queued');

    const logPath = path.join(jobsDir, job.id + '.log');
    const log = await fs.readFile(logPath, 'utf8');
    expect(log).toMatch(/\[job approved\]/);
  });
});
