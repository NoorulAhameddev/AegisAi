import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/session";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const convo = await prisma.conversation.create({
    data: { userId: user.userId },
  });

  return NextResponse.json(convo, { status: 201 });
}
