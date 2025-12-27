import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/session";

export async function POST(req: Request) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversationId, content } = await req.json();
  if (!content) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.userId },
  });

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const msg = await prisma.message.create({
    data: {
      conversationId,
      content,
      role: "USER",
    },
  });

  if (!convo.title) {
    await prisma.conversation.update({
      where: { id: convo.id },
      data: { title: content.split(" ").slice(0, 5).join(" ") },
    });
  }

  await prisma.conversation.update({
    where: { id: convo.id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(msg, { status: 201 });
}
