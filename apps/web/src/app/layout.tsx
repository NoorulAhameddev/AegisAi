import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { CommandPalette } from "@/components/ui/CommandPalette";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aegisai.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Aegis AI — Private Async RAG & Enterprise AI Workspace",
    template: "%s | Aegis AI",
  },
  description:
    "Secure, worker-backed enterprise AI platform. Chat with documents via context-aware RAG, automate background workflows with BullMQ, and stream SSE responses with zero leak risk.",
  keywords: [
    "Enterprise AI",
    "Private RAG",
    "Document AI Chat",
    "Worker Architecture",
    "SSE Streaming AI",
    "Secure AI Workspace",
    "BullMQ Background AI",
  ],
  authors: [{ name: "Aegis AI Engineering Team" }],
  creator: "Aegis AI",
  publisher: "Aegis AI",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Aegis AI — Private Async RAG & Enterprise AI Workspace",
    description:
      "Enterprise-grade AI workspace with worker-queued background processing, vector document retrieval, and instant SSE streaming.",
    siteName: "Aegis AI",
    images: [
      {
        url: `${siteUrl}/aegis_ai_mockup.png`,
        width: 1200,
        height: 630,
        alt: "Aegis AI Private Workspace Interface Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegis AI — Private Async RAG & Enterprise AI Workspace",
    description:
      "Secure, worker-backed enterprise AI platform. Vector search, async queues, and real-time SSE streaming.",
    images: [`${siteUrl}/aegis_ai_mockup.png`],
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Aegis AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description:
    "Private enterprise AI chat platform featuring worker-queued RAG document analysis and real-time SSE streaming.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: {
    "@type": "Organization",
    name: "Aegis AI",
    url: siteUrl,
  },
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

    if (
      !path.startsWith("/maintenance") &&
      !path.startsWith("/login") &&
      !path.startsWith("/admin") &&
      !path.startsWith("/api")
    ) {
      const cookieStore = await cookies();
      const token = cookieStore.get("auth_access")?.value;
      let isAdmin = false;

      if (token) {
        try {
          const payload: any = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET!,
          );
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
          });
          if (user?.role === "ADMIN") isAdmin = true;
        } catch {
          // Token verification failed or user not admin
        }
      }

      if (!isAdmin) {
        redirect("/maintenance");
      }
    }
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <CommandPalette />
        {children}
      </body>
    </html>
  );
}
