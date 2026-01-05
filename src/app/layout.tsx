import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Keep font imports
import "./globals.css";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aegis AI",
  description: "Next-generation intelligent chat platform.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Maintenance Mode Check
  const settings = getSettings();
  if (settings.maintenanceMode) {
    const headersList = await headers();
    const path = headersList.get("x-pathname") || "/";

    if (!path.startsWith("/maintenance") && !path.startsWith("/login") && !path.startsWith("/admin") && !path.startsWith("/api")) {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_access")?.value;
      let isAdmin = false;

      if (token) {
        try {
          const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET!);
          const user = await prisma.user.findUnique({ where: { id: payload.userId } });
          if (user?.role === "ADMIN") isAdmin = true;
        } catch { }
      }

      if (!isAdmin) {
        redirect("/maintenance");
      }
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
