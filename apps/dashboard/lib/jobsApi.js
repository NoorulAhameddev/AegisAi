const fs = require('fs').promises;
const path = require('path');

const jobsDir = path.join(process.cwd(), '.dashboard', 'jobs');
const activity = require('./activity.js');

async function ensure(){
  await fs.mkdir(jobsDir, { recursive: true });
}

function makeId(){
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2,8);
}

async function listJobs(){
  await ensure();
  const files = await fs.readdir(jobsDir).catch(()=>[]);
  const jobs = [];
  for(const f of files){
    if(!f.endsWith('.json')) continue;
    try{ jobs.push(JSON.parse(await fs.readFile(path.join(jobsDir,f),'utf8'))); }catch(e){}
  }
  return jobs;
}

async function createJob(body){
  await ensure();
  const id = makeId();
  // validate dependency-upgrade requests against approved list or existing deps
  if(body.type === 'dependency-upgrade'){
    const pkg = body.package;
    // if a package is provided, validate it; allow missing in tests or manual jobs
    if(pkg && typeof pkg !== 'string') throw new Error('invalid package');
    // simple npm package name safe check
    if(pkg && !/^[a-z0-9@\-\/_.]+$/i.test(pkg)) throw new Error('invalid package name');
    // load approved list
    let approved = [];
    try{
      const cfg = JSON.parse(await fs.readFile(path.join(process.cwd(),'config','approved-dependencies.json'),'utf8'));
      approved = Array.isArray(cfg.approved) ? cfg.approved : [];
    }catch(e){ approved = []; }
    // allow if in approved list or present in package.json deps/devDeps
    let allowed = false;
    if(pkg) {
      allowed = approved.includes(pkg);
      if(!allowed){
        try{
          const pj = JSON.parse(await fs.readFile(path.join(process.cwd(),'package.json'),'utf8'));
          const deps = Object.assign({}, pj.dependencies || {}, pj.devDependencies || {});
          if(deps[pkg]) allowed = true;
        }catch(e){ /* ignore */ }
      }
      if(!allowed) throw new Error('package not approved for automated upgrade');
    }
  }

  const job = Object.assign({ id, type: body.type, status:'queued', created_at: Date.now(), logsPath: `.dashboard/jobs/${id}.log` }, body);
  await fs.writeFile(path.join(jobsDir, id + '.json'), JSON.stringify(job,null,2),'utf8');
  await fs.writeFile(path.join(jobsDir, id + '.log'), `Job ${id} created\n`,'utf8');
  // log activity about job creation
  try{ await activity.logActivity({ kind: 'job.create', jobId: id, type: job.type, meta: body }); }catch(e){}
  return job;
}

async function approveJob(id){
  await ensure();
  const p = path.join(jobsDir, id + '.json');
  let job = null;
  try{ job = JSON.parse(await fs.readFile(p,'utf8')); }catch(e){ return null; }
  job.approved = true;
  // if it was pending approval, move back to queued
  if(job.status === 'pending-approval') job.status = 'queued';
  await fs.writeFile(p, JSON.stringify(job,null,2),'utf8');
  await fs.appendFile(path.join(jobsDir, id + '.log'), '[job approved]\n','utf8');
  return job;
}

module.exports = { listJobs, createJob, approveJob };
