import { NextResponse, NextRequest } from "next/server";
import store from "@/lib/tasksStore";
import activity from "@/lib/activity";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(request);
  if (!user) return unauthorizedResponse();
  const { id } = await context.params;
  const body = await request.json();
  const updated = await store.updateTask(id, body);
  if (!updated)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    await activity.logActivity({
      kind: "task.update",
      taskId: id,
      patch: body,
    });
  } catch (e) {}
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(request);
  if (!user) return unauthorizedResponse();
  const { id } = await context.params;
  const removed = await store.deleteTask(id);
  if (!removed)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    await activity.logActivity({ kind: "task.delete", taskId: id });
  } catch (e) {}
  return NextResponse.json(removed);
}
