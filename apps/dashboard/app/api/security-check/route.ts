import { NextResponse } from "next/server";
import tasksStore from "@/lib/tasksStore";
import activity from "@/lib/activity";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

const requiredSecrets = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "ENCRYPTION_KEY",
  "AUDIT_SIGNING_KEY",
];

function isPlaceholder(val?: string) {
  if (!val) return true;
  return /REMOVE_ME|REPLACE_WITH|your_/.test(val);
}

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  try {
    const missing: string[] = [];
    for (const k of requiredSecrets) {
      const v = process.env[k];
      if (!v || isPlaceholder(v)) missing.push(k);
    }
    const passed = missing.length === 0;
    const issues = passed
      ? []
      : [
          {
            key: "secrets",
            severity: "high",
            message: `Missing or placeholder secrets detected for: ${missing.join(", ")}`,
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
