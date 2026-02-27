const fs = require('fs');
const path = require('path');

const jobsDir = path.join(process.cwd(), '.dashboard', 'jobs');

function tailLog(id, onData){
  const file = path.join(jobsDir, id + '.log');
  if(!fs.existsSync(file)) throw new Error('log not found');
  let pos = 0;
  try{
    const stat = fs.statSync(file);
    const initial = fs.readFileSync(file,'utf8');
    if(initial) onData(initial);
    pos = stat.size;
  }catch(e){}

  const iv = setInterval(()=>{
    try{
      const stat = fs.statSync(file);
      if(stat.size > pos){
        const len = stat.size - pos;
        const fd = fs.openSync(file, 'r');
        try{
          const buf = Buffer.alloc(len);
          fs.readSync(fd, buf, 0, len, pos);
          const tail = buf.toString('utf8');
          pos = stat.size;
          onData(tail);
        }finally{
          try{ fs.closeSync(fd); }catch(e){}
        }
      }
    }catch(e){}
  }, 100);
  // also watch for file changes for more immediate notifications
  let watcher = null;
  try{
    watcher = fs.watch(file, { persistent: false }, (ev)=>{
      if(ev === 'change' || ev === 'rename'){
        try{
          const stat = fs.statSync(file);
          if(stat.size > pos){
            const len = stat.size - pos;
            const fd = fs.openSync(file, 'r');
            try{
              const buf = Buffer.alloc(len);
              fs.readSync(fd, buf, 0, len, pos);
              const tail = buf.toString('utf8');
              pos = stat.size;
              onData(tail);
            }finally{ try{ fs.closeSync(fd); }catch(e){} }
          }
        }catch(e){}
      }
    });
  }catch(e){ watcher = null; }

  return ()=>{
    try{ clearInterval(iv); }catch(e){}
    try{ if(watcher) watcher.close(); }catch(e){}
  };
}

module.exports = { tailLog };
