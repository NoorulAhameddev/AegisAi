import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import AdminConsole from "./AdminConsole";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Console",
  description: "Aegis AI System Health, User Management & Audit Logs",
  robots: {
    index: false,
    follow: false,
  },
};

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_access");

  if (!token) redirect("/login");

  try {
    const payload = jwt.verify(token.value, process.env.JWT_ACCESS_SECRET!) as {
      userId: string;
      role: string;
    };

    if (payload.role !== "ADMIN") {
      redirect("/dashboard");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) redirect("/login");

    return user;
  } catch {
    redirect("/login");
  }
}

export default async function AdminPage() {
  await verifyAdmin();

  return <AdminConsole />;
}
