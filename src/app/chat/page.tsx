import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import ChatClient from "./ChatClient";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_access");

  if (!token) return null;

  try {
    const payload = jwt.verify(token.value, process.env.JWT_ACCESS_SECRET!) as { userId: string; role: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
          id: true,
          name: true,
          email: true,
          role: true
      }
    });
    return user;
  } catch {
    return null;
  }
}

export default async function ChatPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return <ChatClient user={user} />;
}
