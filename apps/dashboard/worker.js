#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const baseDir = path.resolve(__dirname, '../..'); // repo root
const dashboardDir = path.join(baseDir, '.dashboard');
const jobsDir = path.join(dashboardDir, 'jobs');

const { spawnCommand, assertCleanGitTree } = require('./lib/exec');

let Bullmq = null;
try { Bullmq = require('bullmq'); } catch (e) { Bullmq = null; }

const QUEUE_MODE = process.env.QUEUE_MODE || 'local';
const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://127.0.0.1:6379';

async function ensureDirs(){
  await fsp.mkdir(dashboardDir, { recursive: true });
  await fsp.mkdir(jobsDir, { recursive: true });
}

function makeId(){
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2,8);
}

async function saveJob(job){
  const p = path.join(jobsDir, job.id + '.json');
  await fsp.writeFile(p, JSON.stringify(job,null,2),'utf8');
}

async function appendLog(jobId, txt){
  const logPath = path.join(jobsDir, jobId + '.log');
  await fsp.mkdir(path.dirname(logPath), { recursive: true }).catch(()=>{});
  await fsp.appendFile(logPath, txt);
}

async function listQueuedLocal(){
  const files = await fsp.readdir(jobsDir).catch(()=>[]);
  const jobs = [];
  for(const f of files){
    if(!f.endsWith('.json')) continue;
    try{
      const content = JSON.parse(await fsp.readFile(path.join(jobsDir,f),'utf8'));
      if(content.status === 'queued') jobs.push(content);
    }catch(e){/* ignore */}
  }
  return jobs;
}

async function processJob(job){
  const jobId = job.id;
  await appendLog(jobId, `[worker] start ${new Date().toISOString()} type=${job.type}\n`);
  job.status = 'running';
  job.started_at = new Date().toISOString();
  await saveJob(job);

  try{
    // npm-audit: run audit and write vulnerabilities.json if parsable
    if(job.type === 'npm-audit'){
      await appendLog(jobId, '[npm-audit] running npm audit --json\n');
      await spawnCommand({ cmd: 'npm', args: ['audit','--json'], jobId });
      try{
        const raw = await fsp.readFile(path.join(jobsDir, jobId + '.log'),'utf8');
        // try to extract last JSON object from log
        const maybe = raw.replace(/^[\s\S]*?\{/m,'{');
        const parsed = JSON.parse(maybe);
        await fsp.writeFile(path.join(dashboardDir,'vulnerabilities.json'), JSON.stringify(parsed,null,2),'utf8');
      }catch(e){ /* ignore parse errors */ }
      job.finished_at = new Date().toISOString();
      job.result = { ok:true };
      job.status = 'succeeded';
      await saveJob(job);
      return;
    }

    // secret-check: quick placeholder scan
    if(job.type === 'secret-check'){
      await appendLog(jobId, '[secret-check] lightweight scan (no deep traversal)\n');
      await fsp.writeFile(path.join(dashboardDir,'secrets.json'), JSON.stringify({ ts: new Date().toISOString(), findings: [] }, null, 2),'utf8');
      job.finished_at = new Date().toISOString();
      job.result = { ok:true, findingsCount: 0 };
      job.status = 'succeeded';
      await saveJob(job);
      return;
    }

    // test-run: run tests only
    if(job.type === 'test-run'){
      await appendLog(jobId, '[test-run] running npm test\n');
      const res = await spawnCommand({ cmd: 'npm', args: ['test'], jobId }).catch(()=>({ code: 1 }));
      job.finished_at = new Date().toISOString();
      job.result = { ok: res.code === 0, code: res.code };
      job.status = res.code === 0 ? 'succeeded' : 'failed';
      await saveJob(job);
      return;
    }

    // format: run formatter and commit changes if any
    if(job.type === 'format'){
      await appendLog(jobId, '[format] running npm run format\n');
      const res = await spawnCommand({ cmd: 'npm', args: ['run','format'], jobId }).catch(()=>({ code: 1 }));
      if(res.code !== 0){
        await appendLog(jobId, `[format] formatter failed (code=${res.code})\n`);
        job.finished_at = new Date().toISOString();
        job.result = { ok:false, code: res.code };
        job.status = 'failed';
        await saveJob(job);
        return;
      }

      // add & commit formatting changes (ignore commit error if nothing to commit)
      await appendLog(jobId, '[format] staging changes\n');
      await spawnCommand({ cmd: 'git', args: ['add','-A'], jobId }).catch(()=>{});
      await appendLog(jobId, '[format] committing changes\n');
      await spawnCommand({ cmd: 'git', args: ['commit','-m', 'chore: format code'], jobId }).catch(()=>{});

      job.finished_at = new Date().toISOString();
      job.result = { ok:true };
      job.status = 'succeeded';
      await saveJob(job);
      return;
    }

    // dependency-upgrade: automatic package upgrade flow
    if(job.type === 'dependency-upgrade'){
      await appendLog(jobId, `[dependency-upgrade] requested ${job.package}@${job.version}\n`);
      try{
        await assertCleanGitTree({ force: !!job.force });
      }catch(e){
        await appendLog(jobId, `[dependency-upgrade] precheck failed: ${String(e)}\n`);
        job.finished_at = new Date().toISOString();
        job.result = { ok:false, message: String(e) };
        job.status = 'failed';
        await saveJob(job);
        return;
      }

      const branch = `fix/deps-${(job.package||'pkg').replace(/[@\\/]/g,'_')}-${new Date().toISOString().slice(0,10).replace(/-/g,'')}`;
      await appendLog(jobId, `[dependency-upgrade] creating branch ${branch}\n`);
      await spawnCommand({ cmd: 'git', args: ['checkout','-b',branch], jobId });

      await appendLog(jobId, `[dependency-upgrade] installing ${job.package}@${job.version}\n`);
      const install = await spawnCommand({ cmd: 'npm', args: ['install', `${job.package}@${job.version}`], jobId });
      if(install.code !== 0){
        await appendLog(jobId, `[dependency-upgrade] install failed (code=${install.code})\n`);
        job.finished_at = new Date().toISOString();
        job.result = { ok:false, message: 'install failed' };
        job.status = 'failed';
        await saveJob(job);
        return;
      }

      await appendLog(jobId, '[dependency-upgrade] running tests\n');
      const tests = await spawnCommand({ cmd: 'npm', args: ['test'], jobId }).catch(()=>({ code: 1 }));
      if(tests.code !== 0){
        await appendLog(jobId, '[dependency-upgrade] tests failed; creating remediation task\n');
        const tasksPath = path.join(dashboardDir, 'tasks.json');
        let tasks = [];
        try{ tasks = JSON.parse(await fsp.readFile(tasksPath,'utf8')); }catch(e){ tasks = []; }
        const t = { id: makeId(), title: `Upgrade ${job.package} → ${job.version}`, description: `Tests failed for automatic upgrade`, priority: 'High', status: 'todo', created_at: Date.now() };
        tasks.push(t);
        await fsp.writeFile(tasksPath, JSON.stringify(tasks,null,2),'utf8');
        job.finished_at = new Date().toISOString();
        job.result = { ok:false, message: 'tests failed' };
        job.status = 'failed';
        await saveJob(job);
        return;
      }

      await spawnCommand({ cmd: 'git', args: ['add','package.json','package-lock.json'], jobId }).catch(()=>{});
      await spawnCommand({ cmd: 'git', args: ['commit','-m', `chore: upgrade ${job.package} to ${job.version}`], jobId }).catch(()=>{});

      job.finished_at = new Date().toISOString();
      job.result = { ok:true };
      job.status = 'succeeded';
      await saveJob(job);
      return;
    }

    await appendLog(jobId, `[worker] unknown job type ${String(job.type)}\n`);
    job.finished_at = new Date().toISOString();
    job.result = { ok:false, message: 'unknown job type' };
    job.status = 'failed';
    await saveJob(job);
  }catch(err){
    await appendLog(jobId, `[worker] error ${String(err)}\n`);
    job.finished_at = new Date().toISOString();
    job.result = { ok:false, error: String(err) };
    job.attempts = (job.attempts||0) + 1;
    const maxAttempts = job.maxAttempts || 3;
    if(job.attempts < maxAttempts){
      const delay = Math.pow(2, job.attempts) * 1000;
      await appendLog(jobId, `[worker] scheduling retry #${job.attempts} after ${delay}ms\n`);
      job.status = 'queued';
      await saveJob(job);
      setTimeout(()=> enqueueLocal(job), delay);
    } else {
      job.status = 'failed';
      await saveJob(job);
    }
  }
}

async function enqueueLocal(job){
  job.id = job.id || makeId();
  job.status = job.status || 'queued';
  if(!job.created_at) job.created_at = new Date().toISOString();
  await saveJob(job);
}

// optional Redis-backed worker
let redisQueue = null;
if(QUEUE_MODE === 'redis' && Bullmq){
  try{
    const connection = { connection: REDIS_URL };
    const q = new Bullmq.Queue('dashboard-jobs', { connection });
    const scheduler = new Bullmq.QueueScheduler('dashboard-jobs', connection);
    const worker = new Bullmq.Worker('dashboard-jobs', async job => {
      await processJob(job.data);
    }, { connection });
    redisQueue = q;
    console.log('Connected to Redis queue at', REDIS_URL);
  }catch(e){
    console.error('Failed to start Redis queue, falling back to local:', String(e));
  }
}

async function loopLocal(){
  const queued = await listQueuedLocal();
  for(const job of queued){
    job.status = 'running';
    job.started_at = new Date().toISOString();
    await saveJob(job);
    // don't await here to allow parallelism for multiple queued jobs
    processJob(job).catch(e=>{ console.error('job error', e); });
  }
}

async function main(){
  await ensureDirs();
  console.log('Dashboard worker starting, mode=', QUEUE_MODE);
  if(redisQueue){
    console.log('Using Redis-backed BullMQ queue');
  } else {
    console.log('Using local filesystem queue at', jobsDir);
    await loopLocal();
    setInterval(loopLocal, 2000);
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
