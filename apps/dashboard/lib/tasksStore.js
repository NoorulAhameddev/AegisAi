const fs = require('fs').promises;
const path = require('path');

const tasksFile = path.join(process.cwd(), '.dashboard', 'tasks.json');

async function ensureFile(){
  try{ await fs.access(tasksFile); }catch(e){ await fs.writeFile(tasksFile, '[]','utf8'); }
}

async function getTasks(){
  await ensureFile();
  const raw = await fs.readFile(tasksFile,'utf8');
  return JSON.parse(raw || '[]');
}

async function addTask(task){
  const list = await getTasks();
  list.push(task);
  await fs.writeFile(tasksFile, JSON.stringify(list,null,2),'utf8');
  return task;
}

async function updateTask(id, patch){
  const list = await getTasks();
  const idx = list.findIndex(t=>t.id===id);
  if(idx === -1) return null;
  list[idx] = { ...list[idx], ...patch, updated_at: Date.now() };
  await fs.writeFile(tasksFile, JSON.stringify(list,null,2),'utf8');
  return list[idx];
}

async function deleteTask(id){
  const list = await getTasks();
  const idx = list.findIndex(t=>t.id===id);
  if(idx === -1) return null;
  const rem = list.splice(idx,1)[0];
  await fs.writeFile(tasksFile, JSON.stringify(list,null,2),'utf8');
  return rem;
}

module.exports = { getTasks, addTask, updateTask, deleteTask };
