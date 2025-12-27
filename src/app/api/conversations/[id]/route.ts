import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/session";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const convo = await prisma.conversation.findFirst({
    where: { id, userId: user.userId },
  });

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.conversation.delete({ where: { id: convo.id } });

  return NextResponse.json({ success: true });
}
