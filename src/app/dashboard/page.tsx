import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { MessageSquare, FileText, Plus, Clock, Settings, LogOut, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

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
          select: { chats: true, memories: true }
        }
      }
    });
    return user;
  } catch {
    return null;
  }
}

async function getDashboardData(userId: string) {
  const [recentChats, fileCount] = await Promise.all([
    prisma.chat.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    prisma.file.count({
      where: { userId }
    })
  ]);

  return { recentChats, fileCount };
}

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { recentChats, fileCount } = await getDashboardData(user.id);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 font-sans">
      {/* Sidebar (Desktop) / Header (Mobile) */}
      <div className="flex flex-col md:flex-row min-h-screen">

        {/* Sidebar */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-zinc-900/50 p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2 font-bold text-xl px-2">
            <img src="/aegis-logo.png" alt="Aegis AI Logo" className="h-8 w-8 rounded-lg object-contain bg-black/20" />
            Aegis AI
          </div>

          <nav className="flex-1 space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white/10 text-white font-medium">
              <Clock className="h-5 w-5" />
              Overview
            </Link>
            <Link href="/chat" className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              <MessageSquare className="h-5 w-5" />
              Chat
            </Link>
            <Link href="/files" className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              <FileText className="h-5 w-5" />
              Files
            </Link>
            <Link href="/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </nav>

          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user.name}</h1>
              <p className="text-zinc-400 mt-1">Here's what's happening with your projects.</p>
            </div>
            <Link href="/chat" className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors">
              <Plus className="h-5 w-5" />
              New Chat
            </Link>
          </header>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 hover:border-purple-500/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">{user._count.chats}</span>
              </div>
              <h3 className="text-zinc-400 font-medium">Total Chats</h3>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 hover:border-blue-500/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">{fileCount}</span>
              </div>
              <h3 className="text-zinc-400 font-medium">Files Uploaded</h3>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/5 hover:border-green-500/30 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400">
                  <Clock className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">Active</span>
              </div>
              <h3 className="text-zinc-400 font-medium">Account Status</h3>
            </div>
          </div>

          {/* Recent Activity */}
          <section>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Clock className="h-5 w-5 text-zinc-500" />
              Recent Activity
            </h2>

            <div className="space-y-4">
              {recentChats.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-zinc-900/50 border border-white/5 border-dashed">
                  <p className="text-zinc-500">No chats yet. Start a new conversation!</p>
                </div>
              ) : (
                recentChats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/chat?id=${chat.id}`}
                    className="block group p-4 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-zinc-800 hover:border-white/10 transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors">
                          <MessageSquare className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-zinc-200 group-hover:text-white">
                            Chat Session {chat.id.slice(0, 8)}...
                          </h4>
                          <p className="text-sm text-zinc-500 line-clamp-1">
                            {chat.messages[0]?.content.slice(0, 60) || "Empty conversation"}...
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-600 font-mono">
                        {new Date(chat.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
