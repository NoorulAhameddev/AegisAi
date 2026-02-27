const fs = require('fs').promises;
const path = require('path');
const { createJob } = require('../lib/jobsApi');
const { tailLog } = require('../lib/logTail');

const jobsDir = path.join(process.cwd(), '.dashboard', 'jobs');

describe('logTail helper', () => {
  beforeEach(async () => {
    await fs.mkdir(jobsDir, { recursive: true });
  });

  afterEach(async () => {
    const files = await fs.readdir(jobsDir).catch(() => []);
    for (const f of files) {
      await fs.unlink(path.join(jobsDir, f)).catch(() => {});
    }
  });

  test('reads initial content and subsequent appends', async () => {
    const job = await createJob({ type: 'npm-audit' });
    const logPath = path.join(jobsDir, job.id + '.log');
    await fs.writeFile(logPath, 'line1\n', 'utf8');

    const collected = [];
    const stop = tailLog(job.id, (chunk)=>{
      collected.push(chunk);
    });

    // give it a moment to collect initial
    await new Promise(r=>setTimeout(r, 300));
    await fs.appendFile(logPath, 'line2\n', 'utf8');
    await new Promise(r=>setTimeout(r, 400));
    stop();

    const combined = collected.join('');
    expect(combined).toMatch(/line1/);
    expect(combined).toMatch(/line2/);
  }, 5000);
});
