import { NextResponse, NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAuth, unauthorizedResponse } from "../../../../lib/auth";

const jobsDir = path.join(process.cwd(), ".dashboard", "jobs");

function isValidJobId(id: string): boolean {
  return /^[a-zA-Z0-9\-]+$/.test(id);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(request);
  if (!user) return unauthorizedResponse();

  const { id } = await context.params;
  if (!isValidJobId(id))
    return NextResponse.json({ error: "invalid job id" }, { status: 400 });
  const p = path.join(jobsDir, id + ".json");
  try {
    const raw = await fs.readFile(p, "utf8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
