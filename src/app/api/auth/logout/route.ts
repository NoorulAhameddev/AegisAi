import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ message: "Logged out" });
  res.cookies.set("auth_access", "", { maxAge: 0 }); // Clear cookie
  return res;
}
