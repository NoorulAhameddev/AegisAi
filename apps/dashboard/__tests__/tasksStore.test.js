const fs = require('fs').promises;
const path = require('path');
const store = require('../lib/tasksStore.js');

const dashboardDir = path.join(process.cwd(), '.dashboard');
const tasksFile = path.join(dashboardDir, 'tasks.json');

describe('tasksStore', ()=>{
  beforeEach(async()=>{
    await fs.mkdir(dashboardDir, { recursive: true });
    await fs.writeFile(tasksFile, '[]','utf8');
  });
  afterEach(async()=>{
    try{ await fs.unlink(tasksFile); }catch(e){}
  });

  test('add and get tasks', async()=>{
    const t = { id: '1', title: 'foo', description:'', priority:'Medium', status:'todo', created_at: Date.now(), updated_at: Date.now() };
    await store.addTask(t);
    const list = await store.getTasks();
    expect(list.length).toBe(1);
    expect(list[0].title).toBe('foo');
  });

  test('update task', async()=>{
    const t = { id: '2', title: 'bar', description:'', priority:'Low', status:'todo', created_at: Date.now(), updated_at: Date.now() };
    await store.addTask(t);
    const updated = await store.updateTask('2', { status: 'in-progress' });
    expect(updated.status).toBe('in-progress');
  });

  test('delete task', async()=>{
    const t = { id: '3', title: 'x', description:'', priority:'Low', status:'todo', created_at: Date.now(), updated_at: Date.now() };
    await store.addTask(t);
    const rem = await store.deleteTask('3');
    expect(rem.id).toBe('3');
    const list = await store.getTasks();
    expect(list.length).toBe(0);
  });
});
