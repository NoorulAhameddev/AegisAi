const fs = require('fs').promises;
const path = require('path');
const jobsApi = require('../lib/jobsApi.js');

const dashboardDir = path.join(process.cwd(), '.dashboard');
const jobsDir = path.join(dashboardDir, 'jobs');

describe('jobsApi', ()=>{
  beforeEach(async()=>{
    await fs.mkdir(jobsDir, { recursive: true });
    // clear jobs
    const files = await fs.readdir(jobsDir).catch(()=>[]);
    for(const f of files) await fs.unlink(path.join(jobsDir,f)).catch(()=>{});
  });
  afterEach(async()=>{
    const files = await fs.readdir(jobsDir).catch(()=>[]);
    for(const f of files) await fs.unlink(path.join(jobsDir,f)).catch(()=>{});
  });

  test('createJob writes json and log', async()=>{
    const job = await jobsApi.createJob({ type: 'npm-audit' });
    expect(job).toHaveProperty('id');
    const jsonExists = await fs.readFile(path.join(jobsDir, job.id + '.json'),'utf8');
    expect(jsonExists).toBeTruthy();
    const log = await fs.readFile(path.join(jobsDir, job.id + '.log'),'utf8');
    expect(log).toContain('Job ' + job.id);
  });

  test('listJobs returns created jobs', async()=>{
    await jobsApi.createJob({ type: 'npm-audit' });
    await jobsApi.createJob({ type: 'secret-check' });
    const list = await jobsApi.listJobs();
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
});
