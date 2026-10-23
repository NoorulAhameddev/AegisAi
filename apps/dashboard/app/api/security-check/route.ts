import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";
import tasksStore from "@/lib/tasksStore";
import activity from "@/lib/activity";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  try {
    const scriptPath = path.join(
      process.cwd(),
      "scripts",
      "startup-secret-check.js",
    );
    const out: string[] = [];
    const proc = spawn("node", [scriptPath], { shell: false });
    proc.stdout.on("data", (d) => out.push(d.toString()));
    proc.stderr.on("data", (d) => out.push(d.toString()));
    const code = await new Promise((res) => proc.on("close", res));
    const passed = code === 0;
    const issues = passed
      ? []
      : [
          {
            key: "secrets",
            severity: "high",
            message: out.join("").slice(0, 1000),
          },
        ];

    if (!passed) {
      try {
        const id =
          Date.now().toString() + "-" + Math.random().toString(36).slice(2, 6);
        const task = {
          id,
          title: "Secrets detected in repo",
          description: issues[0].message || "Secrets scan failed",
          priority: "High",
          status: "todo",
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        await tasksStore.addTask(task);
        await activity.logActivity({
          kind: "auto.task",
          source: "security-check",
          taskId: id,
          details: { issues },
        });
      } catch (e) {
        /* ignore */
      }
    }

    return NextResponse.json({ passed, issues });
  } catch (e) {
    try {
      await activity.logActivity({
        kind: "security-check.error",
        error: String(e),
      });
    } catch (_) {}
    return NextResponse.json(
      {
        passed: false,
        issues: [{ key: "error", severity: "high", message: String(e) }],
      },
      { status: 500 },
    );
  }
}
