import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import {
  MessageSquare,
  UploadCloud,
  Plus,
  ArrowRight,
  Activity,
  Zap,
} from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_access");

  if (!token) return null;

  try {
    const payload = jwt.verify(token.value, process.env.JWT_ACCESS_SECRET!) as {
      userId: string;
      role: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        _count: {
          select: { Chat: true, Memory: true },
        },
      },
    });
    return user;
  } catch {
    return null;
  }
}

async function getDashboardData(userId: string) {
  const [recentChats, fileCount, messages] = await Promise.all([
    prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        Message: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.file.count({
      where: { userId },
    }),
    prisma.message.findMany({
      where: {
        Chat: { userId },
        role: "USER",
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  // Process activity data
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const activityMap: Record<string, number> = {};
  last7Days.forEach((day) => (activityMap[day] = 0));

  messages.forEach((msg) => {
    const day = msg.createdAt.toISOString().split("T")[0];
    if (activityMap[day] !== undefined) {
      activityMap[day]++;
    }
  });

  const activityData = last7Days.map((day) => ({
    day: new Date(day).toLocaleDateString(undefined, { weekday: "short" }),
    count: activityMap[day],
  }));

  return { recentChats, fileCount, activityData };
}

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { recentChats, fileCount, activityData } = await getDashboardData(
    user.id,
  );

  return (
    <div className="flex min-h-screen bg-ink-950 text-ink-100 font-sans overflow-hidden">
      <div className="hidden md:block">
        <AppSidebar user={user} />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader user={user} />

        <div className="p-6 md:p-12 overflow-y-auto w-full">
          <div className="max-w-6xl mx-auto space-y-12 pb-20">
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <p className="eyebrow mb-3">Overview</p>
                <h1 className="font-display text-4xl font-medium tracking-tight text-ink-100">
                  Welcome back, {(user.name || "User").split(" ")[0]}
                </h1>
                <p className="text-ink-500 mt-2 text-lg">
                  Your AI workspace is ready.
                </p>
              </div>

              <Link
                href="/chat"
                className="btn-bracket inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand text-ink-950 font-medium hover:bg-brand-dim transition-colors"
              >
                <Plus className="mr-1 h-4 w-4" />
                New Chat
              </Link>
            </div>

            {/* Stats Row — vertical dividers, no cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-hair border-t border-b border-hair">
              <div className="py-6 md:px-8 first:pl-0">
                <p className="eyebrow mb-2 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Total Chats
                </p>
                <div className="font-display text-4xl font-medium tracking-tight text-ink-100">
                  {user._count.Chat}
                </div>
              </div>

              <div className="py-6 md:px-8">
                <p className="eyebrow mb-2 flex items-center gap-2">
                  <UploadCloud className="h-3.5 w-3.5" />
                  Files Stored
                </p>
                <div className="font-display text-4xl font-medium tracking-tight text-ink-100">
                  {fileCount}
                </div>
              </div>

              <div className="py-6 md:px-8">
                <p className="eyebrow mb-2 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" />
                  System Status
                </p>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-display text-xl font-medium tracking-tight text-ink-100">
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Section: Analytics & CTA */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-hair border border-hair">
              <div className="lg:col-span-2 bg-ink-900 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="font-display text-lg font-medium tracking-tight text-ink-100 flex items-center gap-2">
                      Usage Analytics
                    </h3>
                    <p className="text-ink-500 text-sm mt-1">
                      Message volume over the last 7 days.
                    </p>
                  </div>
                  <span className="eyebrow flex items-center gap-2">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                    Live
                  </span>
                </div>
                <ActivityChart data={activityData} />
              </div>

              <div className="bg-ink-900 p-8">
                <div className="h-10 w-10 bg-brand/10 border border-brand/25 flex items-center justify-center mb-6">
                  <Zap className="h-5 w-5 text-brand" />
                </div>
                <h3 className="font-display text-xl font-medium tracking-tight text-ink-100 mb-4">
                  Next-level workflow
                </h3>
                <p className="text-ink-500 leading-relaxed mb-8">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 bg-white/5 text-ink-100 font-mono text-sm border border-hair">
                    Cmd + K
                  </kbd>{" "}
                  to search through chats and files from anywhere.
                </p>
                <Link
                  href="/api-docs"
                  className="btn-bracket inline-flex w-full py-3 border border-hair text-ink-300 hover:border-ink-600 hover:text-ink-100 transition-colors items-center justify-center font-medium"
                >
                  View API docs
                </Link>
              </div>
            </div>

            {/* Recent Activity Section */}
            <section className="pb-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-display text-xl font-medium tracking-tight text-ink-100">
                  Recent Activity
                </h2>
                <Link
                  href="/chat"
                  className="eyebrow flex items-center gap-1 text-brand hover:text-brand-dim transition-colors"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-hair border-t border-hair">
                {recentChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 border border-dashed border-ink-700">
                    <div className="h-14 w-14 bg-ink-850 flex items-center justify-center mb-4">
                      <MessageSquare className="h-6 w-6 text-ink-500" />
                    </div>
                    <p className="text-ink-400 font-medium">
                      No conversations yet
                    </p>
                    <p className="text-sm text-ink-500 mt-1">
                      Start a new chat to see history here.
                    </p>
                  </div>
                ) : (
                  recentChats.map((chat) => (
                    <Link href={`/chat?id=${chat.id}`} key={chat.id}>
                      <div className="group flex items-center gap-5 py-5 hover:bg-white/[0.02] transition-colors">
                        <div className="h-10 w-10 bg-ink-850 border border-hair flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-ink-500 group-hover:text-brand transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-ink-200 group-hover:text-ink-100 transition-colors truncate">
                            {chat.title || "Untitled Chat"}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-ink-500 font-mono">
                              ID: {chat.id.slice(0, 8)}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-ink-700" />
                            <span className="text-xs text-ink-500">
                              {new Date(chat.createdAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-ink-600 group-hover:text-brand transition-colors" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
