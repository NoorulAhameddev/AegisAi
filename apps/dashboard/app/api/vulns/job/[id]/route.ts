import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const jobsDir = path.join(process.cwd(), '.dashboard','jobs');

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }){
  const { id } = await context.params;
  const p = path.join(jobsDir, id + '.json');
  try{
    const raw = await fs.readFile(p,'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  }catch(e){
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
