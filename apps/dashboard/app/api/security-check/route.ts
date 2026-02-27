import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function getLibs() {
  const r = (p:string) => eval('require(p)');
  return {
    spawn: r('child_process').spawn,
    tasksStore: r('../../lib/tasksStore'),
    activity: r('../../lib/activity')
  };
}

export async function GET(){
  const { spawn, tasksStore, activity } = getLibs();
  try{
    // run the script with node and capture stdout/stderr
    const getPath = () => path.join(eval('process.cwd()'), 'scripts', 'startup-secret-check.js');
    const scriptPath = getPath();
    const out = [];
    const proc = spawn('node', [scriptPath], { shell: true });
    proc.stdout.on('data', d=> out.push(d.toString()));
    proc.stderr.on('data', d=> out.push(d.toString()));
    const code = await new Promise((res)=> proc.on('close', res));
    const passed = code === 0;
    const issues = passed ? [] : [{ key: 'secrets', severity: 'high', message: out.join('').slice(0,1000) }];

    if(!passed){
      // create a task automatically to investigate secrets
      try{
        const id = Date.now().toString() + '-' + Math.random().toString(36).slice(2,6);
        const task = { id, title: 'Secrets detected in repo', description: issues[0].message || 'Secrets scan failed', priority: 'High', status: 'todo', created_at: Date.now(), updated_at: Date.now() };
        await tasksStore.addTask(task);
        await activity.logActivity({ kind: 'auto.task', source: 'security-check', taskId: id, details: { issues } });
      }catch(e){ /* ignore */ }
    }

    return NextResponse.json({ passed, issues });
  }catch(e){
    try{ await activity.logActivity({ kind: 'security-check.error', error: String(e) }); }catch(_){}
    return NextResponse.json({ passed:false, issues:[{ key:'error', severity:'high', message:String(e) }] }, { status:500 });
  }
}
