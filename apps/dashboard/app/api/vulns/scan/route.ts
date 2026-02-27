import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dashboardDir = path.join(process.cwd(), '.dashboard');
const jobsDir = path.join(dashboardDir, 'jobs');

function makeId(){
  return Date.now().toString() + '-' + Math.random().toString(36).slice(2,8);
}

export async function POST(req: Request){
  await fs.mkdir(jobsDir, { recursive:true });
  const body = await req.json().catch(()=>({}));
  const id = makeId();
  const logPath = path.join(jobsDir, id + '.log');
  const jobType = body.type || 'npm-audit';
  const job = {
    id,
    type: jobType,
    status: 'queued',
    created_at: Date.now(),
    logsPath: logPath,
    payload: body.payload || {}
  };
  const p = path.join(jobsDir, id + '.json');
  await fs.writeFile(p, JSON.stringify(job,null,2),'utf8');
  return NextResponse.json({ success:true, jobId: id, type: jobType });
}
