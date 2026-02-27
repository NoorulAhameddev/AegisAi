const fs = require('fs').promises;
const path = require('path');

const activityFile = path.join(process.cwd(), '.dashboard', 'activity.log');

async function ensureDir(){
  const dir = path.dirname(activityFile);
  await fs.mkdir(dir, { recursive: true }).catch(()=>{});
  // ensure file exists
  await fs.writeFile(activityFile, '', { encoding: 'utf8', flag: 'a' }).catch(()=>{});
}

async function logActivity(entry){
  await ensureDir();
  const payload = Object.assign({ timestamp: Date.now() }, entry);
  // Append JSON line safely
  const line = JSON.stringify(payload) + '\n';
  // use appendFile which is atomic for appends on most platforms
  await fs.appendFile(activityFile, line, 'utf8');
  return payload;
}

async function readAll(){
  await ensureDir();
  const raw = await fs.readFile(activityFile,'utf8').catch(()=>'');
  if(!raw) return [];
  return raw.split(/\r?\n/).filter(Boolean).map(l=>{ try{return JSON.parse(l);}catch(e){return { raw:l }; } });
}

module.exports = { logActivity, readAll, activityFile };
