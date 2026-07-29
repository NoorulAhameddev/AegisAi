import { NextResponse } from "next/server";
import store from "../../lib/tasksStore";
import activity from "../../lib/activity";
import { requireAuth, unauthorizedResponse } from "../../../lib/auth";

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();
  const data = await store.getTasks().catch(() => []);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();
  const body = await req.json();
  const id =
    Date.now().toString() + "-" + Math.random().toString(36).slice(2, 6);
  const task = {
    id,
    title: body.title || "New Task",
    description: body.description || "",
    priority: body.priority || "Medium",
    status: "todo",
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  const saved = await store.addTask(task);
  try {
    await activity.logActivity({
      kind: "task.create",
      taskId: saved.id,
      title: saved.title,
      priority: saved.priority,
    });
  } catch (e) {}
  return NextResponse.json(saved);
}
