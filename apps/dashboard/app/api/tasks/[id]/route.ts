import { NextResponse, NextRequest } from 'next/server';

function getLibs() {
  const r = (p:string) => eval('require(p)');
  return {
    store: r('../../../lib/tasksStore'),
    activity: r('../../../lib/activity')
  };
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }){
  const { store, activity } = getLibs();
  const { id } = await context.params;
  const body = await request.json();
  const updated = await store.updateTask(id, body);
  if(!updated) return NextResponse.json({ error:'not found' }, { status:404 });
  try{ await activity.logActivity({ kind: 'task.update', taskId: id, patch: body }); }catch(e){}
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }){
  const { store, activity } = getLibs();
  const { id } = await context.params;
  const removed = await store.deleteTask(id);
  if(!removed) return NextResponse.json({ error:'not found' }, { status:404 });
  try{ await activity.logActivity({ kind: 'task.delete', taskId: id }); }catch(e){}
  return NextResponse.json(removed);
}
