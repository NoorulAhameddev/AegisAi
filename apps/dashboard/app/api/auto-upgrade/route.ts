import { promisify } from "util";
import { exec } from "child_process";
import tasksStore from "@/lib/tasksStore";
import activity from "@/lib/activity";
import jobsApi from "@/lib/jobsApi";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

function normalizeVersion(v: string) {
  if (!v || typeof v !== "string") return [0, 0, 0];
  v = v.replace(/^[^0-9]*/, "");
  v = v.split("-")[0].split("+")[0];
  const parts = v.split(".").slice(0, 3);
  while (parts.length < 3) parts.push("0");
  return parts.map((p) => parseInt(p, 10) || 0);
}

function semverDiff(current: string, wanted: string) {
  const [cMaj, cMin, cPat] = normalizeVersion(current);
  const [wMaj, wMin, wPat] = normalizeVersion(wanted);
  if (wMaj > cMaj) return "major";
  if (wMaj < cMaj) return "none";
  if (wMin > cMin) return "minor";
  if (wMin < cMin) return "none";
  if (wPat > cPat) return "patch";
  return "none";
}

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();
  try {
    const execAsync = promisify(exec);
    const { stdout, stderr } = await execAsync("npm outdated --json ");
    const raw = (stdout && stdout.trim()) || (stderr && stderr.trim()) || "";
    let parsed = {};
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        const start = raw.indexOf("{");
        if (start >= 0) {
          const maybe = raw.slice(start);
          parsed = JSON.parse(maybe);
        } else {
          throw e;
        }
      }
    }

    const enqueued = [];
    const counts: any = { patch: 0, minor: 0, major: 0, none: 0 };

    for (const [pkg, info] of Object.entries(parsed || {})) {
      const current =
        info && (info as any).current ? String((info as any).current) : "0.0.0";
      const wanted =
        info && (info as any).wanted ? String((info as any).wanted) : current;
      const diff = semverDiff(current, wanted);
      if (diff === "patch" || diff === "minor") {
        const job = await jobsApi.createJob({
          type: "dependency-upgrade",
          package: pkg,
          version: wanted,
        });
        if (job && job.id) {
          enqueued.push(job.id);
          try {
            const id =
              Date.now().toString() +
              "-" +
              Math.random().toString(36).slice(2, 6);
            const task = {
              id,
              title: `Upgrade ${pkg} to ${wanted}`,
              description: `Auto-enqueued upgrade job ${job.id} for ${pkg}`,
              priority: diff === "minor" ? "Medium" : "Low",
              status: "todo",
              created_at: Date.now(),
              updated_at: Date.now(),
              jobId: job.id,
            };
            await tasksStore.addTask(task);
            await activity.logActivity({
              kind: "auto.task",
              source: "auto-upgrade",
              taskId: id,
              jobId: job.id,
              package: pkg,
              version: wanted,
            });
          } catch (e) {}
        }
      }
      if (!counts.hasOwnProperty(diff)) counts[diff] = 0;
      counts[diff]++;
    }

    const body = { enqueuedJobIds: enqueued, counts };
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("auto-upgrade route failed", error);
    return new Response(
      JSON.stringify({ error: "Auto-upgrade failed. Please check server logs." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
