import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get("auth_refresh")?.value;

  if (refresh) {
    await prisma.user.updateMany({ where: { refreshToken: refresh }, data: { refreshToken: null } });
  }

  const res = NextResponse.json({ message: "Logged out" });
  res.cookies.delete("auth_access");
  res.cookies.delete("auth_refresh");
  return res;
}
