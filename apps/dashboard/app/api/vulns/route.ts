import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dashboardDir = path.join(process.cwd(), '.dashboard');
const vulnsFile = path.join(dashboardDir, 'vulnerabilities.json');

export async function GET(){
  try{
    const raw = await fs.readFile(vulnsFile, 'utf8').catch(()=>null);
    if(!raw) return NextResponse.json({ summary:{timestamp:null,counts:{critical:0,high:0,moderate:0,low:0}}, top:[] });
    const data = JSON.parse(raw);
    // Try to collect counts from common npm audit schemas
    let counts = {critical:0,high:0,moderate:0,low:0};
    const top = [];
    if(data.vulnerabilities){
      for(const [pkg, info] of Object.entries(data.vulnerabilities)){
        const sev = (info as any).severity || 'moderate';
        if(sev==='critical') counts.critical++;
        else if(sev==='high') counts.high++;
        else if(sev==='moderate') counts.moderate++;
        else counts.low++;
        top.push({ package: pkg, severity: sev, details: info });
      }
    } else if(data.advisories){
      for(const [k, adv] of Object.entries(data.advisories)){
        const sev = (adv as any).severity || 'moderate';
        if(sev==='critical') counts.critical++;
        else if(sev==='high') counts.high++;
        else if(sev==='moderate') counts.moderate++;
        else counts.low++;
        top.push({ package: (adv as any).module_name, severity: sev, details: adv });
      }
    }
    top.sort((a:any,b:any)=> (a.severity===b.severity?0: a.severity==='critical'?-1:1));
    const normalized = {
      timestamp: Date.now(),
      counts,
      top: top.slice(0,20).map((t:any)=>({ package: t.package, severity: t.severity, fixAvailable: !!(t.details && t.details.fixAvailable), isDirect: !!(t.details && t.details.isDirect), details: JSON.stringify(t.details).slice(0,100) }))
    };
    return NextResponse.json(normalized);
  }catch(e){
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
