import { NextResponse } from 'next/server';

function getJobsApi() { 
  const r = (p:string) => eval('require(p)');
  return r('../../../../../lib/jobsApi');
}

export async function POST(req: Request){
  const jobsApi = getJobsApi();
  try{
    const params = (req as any).params || {};
    const id = params.id || null;
    if(!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
    const job = await jobsApi.approveJob(id);
    if(!job) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, job });
  }catch(e){
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
