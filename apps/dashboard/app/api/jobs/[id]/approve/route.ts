import { NextResponse } from "next/server";
import jobsApi from "@/lib/jobsApi";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

function isValidJobId(id: string): boolean {
  return /^[a-zA-Z0-9\-]+$/.test(id);
}

export async function POST(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();
  try {
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id || !isValidJobId(id))
      return NextResponse.json(
        { error: "missing or invalid id" },
        { status: 400 },
      );
    const job = await jobsApi.approveJob(id);
    if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, job });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
