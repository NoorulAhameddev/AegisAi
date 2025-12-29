"use client";

import { useState } from "react";
import { ArrowLeft, Save, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Account Settings</h1>
                </div>

                {/* Profile Section */}
                <section className="mb-8 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                    <h2 className="text-lg font-semibold mb-4">Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Display Name</label>
                            <input
                                disabled
                                defaultValue="User"
                                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-2 text-zinc-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-zinc-600 mt-1">Contact support to change your name.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
                            <input
                                disabled
                                defaultValue="user@example.com"
                                className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-2 text-zinc-500 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </section>

                {/* Security Section */}
                <section className="mb-8 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                    <h2 className="text-lg font-semibold mb-4">Security</h2>
                    <button className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 font-medium text-sm">
                        Change Password
                    </button>
                </section>

                {/* Danger Zone */}
                <section className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
                    <h2 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium">Sign Out</p>
                            <p className="text-sm text-zinc-500">Log out of your account on this device.</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium text-sm transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            {loading ? "Signing out..." : "Sign Out"}
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
