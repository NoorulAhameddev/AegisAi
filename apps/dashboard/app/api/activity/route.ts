import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { requireAuth, unauthorizedResponse } from "@/lib/auth";

const activityFile = path.join(process.cwd(), ".dashboard", "activity.log");

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (!user) return unauthorizedResponse();

  const raw = await fs.readFile(activityFile, "utf8").catch(() => null);
  if (!raw) return NextResponse.json([]);
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const items = lines.map((l) => {
    try {
      return JSON.parse(l);
    } catch (e) {
      return { raw: l };
    }
  });
  return NextResponse.json(items);
}
