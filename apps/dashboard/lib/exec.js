const { spawn } = require('child_process');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

const baseDir = path.resolve(__dirname, '../..');

// Whitelisted commands allowed to run from background jobs
const WHITELIST = new Set(['git', 'npm', 'node', 'yarn', 'npx']);

function isAllowedCommand(cmd) {
  // allow absolute paths that end with whitelisted command too
  const base = path.basename(cmd);
  return WHITELIST.has(base);
}

/**
 * Spawn a child process safely.
 * - Validates command against a whitelist
 * - Does NOT use a shell (avoids shell expansion/injection)
 * - Streams stdout/stderr to job log with timestamps
 */
async function spawnCommand(opts){
  // opts: { cmd, args, cwd, logPath, jobId }
  if(!opts || !opts.cmd) throw new Error('missing command');
  if(!isAllowedCommand(opts.cmd)) throw new Error('command not allowed');

  const cwd = opts.cwd || baseDir;
  const args = Array.isArray(opts.args) ? opts.args.map(String) : [];
  const logPath = opts.logPath || path.join(baseDir, '.dashboard','jobs', (opts.jobId || 'unknown') + '.log');

  await fsp.mkdir(path.dirname(logPath), { recursive: true }).catch(()=>{});
  const outStream = fs.createWriteStream(logPath, { flags: 'a' });

  function writeLine(prefix, chunk){
    const now = new Date().toISOString();
    const txt = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    // write with timestamp per chunk to make tailing clearer
    outStream.write(`[${now}] ${prefix} ${txt}`);
  }

  return new Promise((resolve, reject)=>{
    const proc = spawn(opts.cmd, args, { cwd, shell: false });

    proc.stdout.on('data', d=>{ writeLine('OUT:', d); });
    proc.stderr.on('data', d=>{ writeLine('ERR:', d); });

    proc.on('error', err=>{
      writeLine('ERR:', '\n[process error] '+String(err)+"\n");
      outStream.end();
      reject(err);
    });

    proc.on('close', code=>{
      writeLine('INFO:', `\n[exit code] ${String(code)}\n`);
      outStream.end();
      resolve({ code });
    });
  });
}

async function assertCleanGitTree({ force=false } = {}){
  const { execSync } = require('child_process');
  // check detached HEAD
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: baseDir }).toString().trim();
  if(branch === 'HEAD' && !force) throw new Error('detached HEAD');

  // check rebase
  const rebaseApply = path.join(baseDir, '.git', 'rebase-apply');
  const rebaseMerge = path.join(baseDir, '.git', 'rebase-merge');
  if((fs.existsSync(rebaseApply) || fs.existsSync(rebaseMerge)) && !force) throw new Error('rebase in progress');

  // check uncommitted
  const status = execSync('git status --porcelain', { cwd: baseDir }).toString().trim();
  if(status) throw new Error('uncommitted changes present');

  return true;
}

module.exports = { spawnCommand, assertCleanGitTree, isAllowedCommand };
