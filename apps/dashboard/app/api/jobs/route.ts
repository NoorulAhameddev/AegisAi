import { NextResponse } from 'next/server';
const jobsApi = require('../../../lib/jobsApi.js');

export async function GET(){
  const jobs = await jobsApi.listJobs();
  jobs.sort((a:any,b:any)=> (b.created_at||0) - (a.created_at||0));
  return NextResponse.json(jobs);
}

export async function POST(req: Request){
  try{
    const body = await req.json();
    const allowed = ['npm-audit','secret-check','dependency-upgrade','test-run','format'];
    if(!allowed.includes(body.type)) return new NextResponse(JSON.stringify({ error: 'invalid job type' }), { status: 400 });
    const job = await jobsApi.createJob(body);
    return NextResponse.json({ jobId: job.id });
  }catch(e){
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
