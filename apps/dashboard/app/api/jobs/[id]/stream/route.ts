import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { tailLog } from '../../../../../lib/logTail';

const jobsDir = path.join(process.cwd(), '.dashboard','jobs');

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }){
  const { id } = await context.params;
  const file = path.join(jobsDir, id + '.log');
  if(!fs.existsSync(file)) return NextResponse.json({ error: 'log not found' }, { status: 404 });

  const stream = new ReadableStream({
    async start(controller){
      const send = (s)=> controller.enqueue(new TextEncoder().encode('data: '+s.replace(/\n/g,'\ndata: ')+"\n\n"));
      // use shared tail helper
      const stop = tailLog(id, (chunk)=>{
        try{ send(chunk); }catch(e){}
      });
      // Handle abort signal from request
      if (request.signal) {
        request.signal.addEventListener('abort', ()=>{ stop(); controller.close(); });
      }
    }
  });

  return new Response(stream, { status:200, headers: { 'Content-Type':'text/event-stream', 'Cache-Control':'no-cache' } });
}
