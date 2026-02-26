const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'apps', 'dashboard', '.status.log');
function logLine(line){
  const ts = new Date().toISOString();
  fs.appendFileSync(OUT, `[${ts}] ${line}\n`);
}

async function runCmd(cmd){
  return new Promise((resolve)=>{
    exec(cmd,{cwd: path.join(__dirname,'..')}, (err, stdout, stderr)=>{
      resolve({err, stdout, stderr});
    });
  });
}

async function snapshot(){
  try{
    // git branch
    const gitBranch = await runCmd('git rev-parse --abbrev-ref HEAD');
    // git status short
    const gitStatus = await runCmd('git status --porcelain');
    // npm audit summary (quick)
    const npmAudit = await runCmd('npm audit --json');
    let auditSummary = '';
    try{
      const audit = JSON.parse(npmAudit.stdout||'{}');
      if(audit.error) auditSummary = `audit error: ${audit.error.summary || audit.error}`;
      else if(audit.metadata && audit.metadata.vulnerabilities){
        const v = audit.metadata.vulnerabilities;
        auditSummary = `vulns C:${v.critical||0} H:${v.high||0} M:${v.moderate||0} L:${v.low||0}`;
      } else auditSummary = 'no audit data';
    }catch(e){
      auditSummary = 'npm audit parse failed';
    }

    logLine(`branch=${(gitBranch.stdout||'').trim()}; status_lines=${(gitStatus.stdout||'').split('\n').filter(Boolean).length}; ${auditSummary}`);
  }catch(e){
    logLine('snapshot failed: '+e.message);
  }
}

(async()=>{
  logLine('status-loop-start');
  while(true){
    await snapshot();
    // wait 5 minutes
    await new Promise(r=>setTimeout(r,5*60*1000));
  }
})();
