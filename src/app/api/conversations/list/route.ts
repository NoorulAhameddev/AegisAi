import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/session";

const LIMIT = 20;

export async function GET(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: LIMIT + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1,
    }),
  });

  const nextCursor =
    conversations.length > LIMIT ? conversations.pop()?.id : null;

  return NextResponse.json({ conversations, nextCursor });
}
