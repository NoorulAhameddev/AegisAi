"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Users, Clock, ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Metrics = {
    users: number;
    totalTokensUsed: number;
};

type UserData = {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    _count: { chats: number };
};

type ActivityData = {
    id: string;
    tokens: number;
    createdAt: string;
    user: { name: string; email: string };
};

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);

    // Data
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [users, setUsers] = useState<UserData[]>([]);
    const [activity, setActivity] = useState<ActivityData[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [mRes, uRes, aRes] = await Promise.all([
                    fetch("/api/admin/metrics"),
                    fetch("/api/admin/users"),
                    fetch("/api/admin/activity")
                ]);

                if ([mRes, uRes, aRes].some(r => r.status === 401 || r.status === 403)) {
                    router.push("/login"); // Simple protection
                    return;
                }

                setMetrics(await mRes.json());
                setUsers(await uRes.json());
                setActivity(await aRes.json());
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading admin portal...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-950 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                        <ArrowLeft className="h-5 w-5 text-zinc-400" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <ShieldAlert className="h-6 w-6 text-red-500" />
                            Admin Console
                        </h1>
                        <p className="text-xs text-zinc-500">System Monitoring & User Management</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {["overview", "users", "settings"].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                                activeTab === tab ? "bg-white text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            <main className="p-8 max-w-7xl mx-auto space-y-8">

                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="card-gradient p-6 rounded-2xl border border-white/5 bg-zinc-900/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-mono text-zinc-500">TOTAL</span>
                                </div>
                                <div className="text-3xl font-bold mb-1">{metrics?.users}</div>
                                <div className="text-sm text-zinc-400">Registered Users</div>
                            </div>

                            <div className="card-gradient p-6 rounded-2xl border border-white/5 bg-zinc-900/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                                        <BarChart3 className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-mono text-zinc-500">LIFETIME</span>
                                </div>
                                <div className="text-3xl font-bold mb-1">{metrics?.totalTokensUsed.toLocaleString()}</div>
                                <div className="text-sm text-zinc-400">Tokens Consumed</div>
                            </div>

                            <div className="card-gradient p-6 rounded-2xl border border-white/5 bg-zinc-900/50">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                                        <Clock className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-mono text-zinc-500">LIVE</span>
                                </div>
                                <div className="text-3xl font-bold mb-1">99.9%</div>
                                <div className="text-sm text-zinc-400">System Uptime</div>
                            </div>
                        </div>

                        {/* Recent Activity Log */}
                        <section className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden">
                            <div className="p-6 border-b border-white/5">
                                <h3 className="font-semibold text-lg">System Activity Log</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-zinc-400">
                                    <thead className="bg-zinc-900/50 text-zinc-300 font-medium">
                                        <tr>
                                            <th className="px-6 py-4">User</th>
                                            <th className="px-6 py-4">Event</th>
                                            <th className="px-6 py-4">Details</th>
                                            <th className="px-6 py-4 text-right">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {activity.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No activity recorded yet.</td>
                                            </tr>
                                        ) : (activity.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">{log.user?.email || "Unknown"}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-xs">
                                                        TOKEN_USAGE
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">{log.tokens} tokens consumed</td>
                                                <td className="px-6 py-4 text-right font-mono text-xs">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        )))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}

                {/* Users Tab */}
                {activeTab === "users" && (
                    <section className="rounded-2xl border border-white/5 bg-zinc-900/30 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-semibold text-lg">User Management</h3>
                            <button className="px-4 py-2 bg-white text-black text-sm font-semibold rounded-lg hover:bg-zinc-200">Export CSV</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-400">
                                <thead className="bg-zinc-900/50 text-zinc-300 font-medium">
                                    <tr>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4 text-center">Chats</th>
                                        <th className="px-6 py-4 text-right">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-white">{u.name}</td>
                                            <td className="px-6 py-4">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-2 py-1 rounded text-xs",
                                                    u.role === "ADMIN" ? "bg-red-500/10 text-red-400" : "bg-zinc-800 text-zinc-400"
                                                )}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">{u._count.chats}</td>
                                            <td className="px-6 py-4 text-right font-mono text-xs">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Settings Tab - Placeholder */}
                {activeTab === "settings" && (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <Loader2 className="h-8 w-8 mb-4 animate-spin opacity-50" />
                        <p>Global system settings coming soon.</p>
                    </div>
                )}

            </main>
        </div>
    );
}
