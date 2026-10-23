import { NextResponse } from "next/server";
import jobsApi from "@/lib/jobsApi";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();
  const jobs = await jobsApi.listJobs();
  jobs.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
  return NextResponse.json(jobs);
}

export async function POST(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();
  try {
    const body = await req.json();
    const allowed = [
      "npm-audit",
      "secret-check",
      "dependency-upgrade",
      "test-run",
      "format",
    ];
    if (!allowed.includes(body.type))
      return new NextResponse(JSON.stringify({ error: "invalid job type" }), {
        status: 400,
      });
    const job = await jobsApi.createJob(body);
    return NextResponse.json({ jobId: job.id });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
