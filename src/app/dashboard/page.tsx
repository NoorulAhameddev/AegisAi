import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { MessageSquare, UploadCloud, Clock, Plus, ArrowRight, BarChart3, Zap } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { ActivityChart } from "@/components/dashboard/ActivityChart";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_access");

  if (!token) return null;

  try {
    const payload = jwt.verify(token.value, process.env.JWT_ACCESS_SECRET!) as { userId: string; role: string };
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        _count: {
          select: { Chat: true, Memory: true }
        }
      }
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
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    prisma.file.count({
      where: { userId }
    }),
    prisma.message.findMany({
      where: {
        Chat: { userId },
        role: "USER"
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 500
    })
  ]);

  // Process activity data
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const activityMap: Record<string, number> = {};
  last7Days.forEach(day => activityMap[day] = 0);

  messages.forEach(msg => {
    const day = msg.createdAt.toISOString().split('T')[0];
    if (activityMap[day] !== undefined) {
      activityMap[day]++;
    }
  });

  const activityData = last7Days.map(day => ({
    day: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
    count: activityMap[day]
  }));

  return { recentChats, fileCount, activityData };
}

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { recentChats, fileCount, activityData } = await getDashboardData(user.id);

  return (
    <div className="flex min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans overflow-hidden">
      <div className="hidden md:block">
        <AppSidebar user={user} />
      </div>

      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <DashboardHeader user={user} />

        <div className="p-6 md:p-12 overflow-y-auto w-full">
          <div className="max-w-6xl mx-auto space-y-10 pb-20">
            
            {/* Header Content */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-slide-up">
              <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white via-white to-zinc-400">
                  Welcome back, {user.name.split(" ")[0]}
                </h1>
                <p className="text-zinc-400 mt-2 text-lg">
                  Your AI workspace is ready.
                </p>
              </div>
              
              <Link 
                href="/chat" 
                className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-white px-8 font-medium text-black transition-all hover:bg-zinc-200 hover:scale-105 active:scale-95"
              >
                <div className="absolute inset-0 bg-linear-to-r from-purple-400 to-blue-500 opacity-0 transition-opacity group-hover:opacity-10" />
                <Plus className="mr-2 h-5 w-5 transition-transform group-hover:rotate-90" />
                New Chat
              </Link>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GlassCard gradient="purple" interactive className="animate-slide-up [animation-delay:100ms] opacity-0 fill-mode-forwards">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 font-medium mb-1">Total Chats</p>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{user._count.Chat}</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard gradient="blue" interactive className="animate-slide-up [animation-delay:200ms] opacity-0 fill-mode-forwards">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 font-medium mb-1">Files Stored</p>
                    <h3 className="text-4xl font-bold text-white tracking-tight">{fileCount}</h3>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                </div>
              </GlassCard>

              <GlassCard gradient="emerald" interactive className="animate-slide-up [animation-delay:300ms] opacity-0 fill-mode-forwards">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-zinc-400 font-medium mb-1">System Status</p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-xl font-bold text-white tracking-tight">Active</h3>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Middle Section: Analytics & Welcome */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up [animation-delay:400ms] opacity-0 fill-mode-forwards">
                 <div className="lg:col-span-2">
                    <GlassCard className="p-8 h-full">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-purple-400" /> Usage Analytics
                                </h3>
                                <p className="text-zinc-500 text-sm mt-1">Message volume over the last 7 days.</p>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Live</span>
                            </div>
                        </div>
                        <ActivityChart data={activityData} />
                    </GlassCard>
                 </div>

                 <div className="lg:col-span-1">
                    <GlassCard gradient="blue" className="p-8 h-full bg-linear-to-br from-indigo-500/10 to-transparent">
                        <div className="h-12 w-12 rounded-2xl bg-white text-black flex items-center justify-center mb-6 shadow-xl shadow-white/5">
                            <Zap className="h-6 w-6 fill-current" />
                        </div>
                        <h3 className="text-xl font-bold mb-4 italic">Next Level Workflow</h3>
                        <p className="text-zinc-400 leading-relaxed mb-8">
                            Try pressing <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-sm">Cmd + K</kbd> to quickly search through your chats and files from anywhere.
                        </p>
                        <button className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-bold">
                            View API Docs
                        </button>
                    </GlassCard>
                 </div>
            </div>

            {/* Recent Activity Section */}
            <section className="animate-slide-up [animation-delay:500ms] opacity-0 fill-mode-forwards pb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Recent Activity</h2>
                <Link href="/chat" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group">
                  View all <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              
              <div className="grid gap-3">
                {recentChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30">
                    <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                      <MessageSquare className="h-6 w-6 text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 font-medium">No conversations yet</p>
                    <p className="text-sm text-zinc-600 mt-1">Start a new chat to see history here.</p>
                  </div>
                ) : (
                  recentChats.map((chat) => (
                    <Link href={`/chat?id=${chat.id}`} key={chat.id}>
                      <div className="group flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-purple-500/20 hover:shadow-lg transition-all duration-300">
                        <div className="h-12 w-12 rounded-full bg-linear-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-white/5 group-hover:border-purple-500/30 transition-colors">
                            <MessageSquare className="h-5 w-5 text-zinc-400 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-zinc-200 group-hover:text-white transition-colors truncate">
                              {chat.Message[0]?.content.slice(0, 80) || "New Conversation"}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-zinc-500 font-mono">ID: {chat.id.slice(0, 8)}</span>
                              <span className="h-1 w-1 rounded-full bg-zinc-700" />
                              <span className="text-xs text-zinc-500">{new Date(chat.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</span>
                            </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-zinc-600 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
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
