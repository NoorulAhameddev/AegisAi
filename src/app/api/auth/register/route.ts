import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Weak password" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email exists" }, { status: 409 });
    }

    const hashed = await hashPassword(password);

    await prisma.user.create({
      data: { name, email, password: hashed },
    });

    return NextResponse.json({ message: "Registered" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
