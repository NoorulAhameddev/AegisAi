import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { tailLog } from "../../../../../lib/logTail";
import { requireAuth, unauthorizedResponse } from "../../../../../lib/auth";

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
  const file = path.join(jobsDir, id + ".log");
  if (!fs.existsSync(file))
    return NextResponse.json({ error: "log not found" }, { status: 404 });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s) =>
        controller.enqueue(
          new TextEncoder().encode(
            "data: " + s.replace(/\n/g, "\ndata: ") + "\n\n",
          ),
        );
      // use shared tail helper
      const stop = tailLog(id, (chunk) => {
        try {
          send(chunk);
        } catch (e) {}
      });
      // Handle abort signal from request
      if (request.signal) {
        request.signal.addEventListener("abort", () => {
          stop();
          controller.close();
        });
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
