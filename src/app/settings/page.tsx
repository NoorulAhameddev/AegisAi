"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Save, LogOut, Loader2, Lock, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = {
    id: string;
    name: string;
    email: string;
    role: string;
};

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Edit States
    const [displayName, setDisplayName] = useState("");
    const [passwordMode, setPasswordMode] = useState(false);

    // Password Form
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [passwordMsg, setPasswordMsg] = useState("");

    useEffect(() => {
        fetch("/api/auth/me")
            .then(res => {
                if (res.status === 401) router.push("/login");
                return res.json();
            })
            .then(data => {
                if (data.id) {
                    setUser(data);
                    setDisplayName(data.name);
                }
            })
            .finally(() => setLoading(false));
    }, [router]);

    const handleUpdateProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: displayName })
            });
            const data = await res.json();
            if (res.ok) {
                setUser(prev => prev ? { ...prev, name: data.name } : null);
                alert("Profile updated!");
            } else {
                alert(data.error || "Update failed");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMsg("Updating...");
        try {
            const res = await fetch("/api/user/password", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                setPasswordMsg("Password changed successfully!");
                setCurrentPassword("");
                setNewPassword("");
                setTimeout(() => setPasswordMode(false), 1500);
            } else {
                setPasswordMsg("Error: " + data.error);
            }
        } catch (e) {
            setPasswordMsg("Failed to connect");
        }
    };

    const handleLogout = async () => {
        if (!confirm("Are you sure you want to sign out?")) return;
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading settings...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold">Account Settings</h1>
                </div>

                {/* Profile Section */}
                <section className="mb-6 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        Profile
                        {user?.name !== displayName && (
                            <span className="text-xs text-amber-500 font-normal">(Unsaved changes)</span>
                        )}
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Display Name</label>
                            <div className="flex gap-2">
                                <input
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="flex-1 rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-2 text-white focus:outline-none focus:border-zinc-600 transition-colors"
                                />
                                <button
                                    onClick={handleUpdateProfile}
                                    disabled={saving || user?.name === displayName}
                                    className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
                            <input
                                disabled
                                value={user?.email || ""}
                                className="w-full rounded-lg bg-zinc-950/50 border border-zinc-800 px-4 py-2 text-zinc-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-zinc-600 mt-1">Email cannot be changed.</p>
                        </div>
                    </div>
                </section>

                {/* Security Section */}
                <section className="mb-6 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40">
                    <h2 className="text-lg font-semibold mb-4">Security</h2>

                    {!passwordMode ? (
                        <button
                            onClick={() => setPasswordMode(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 font-medium text-sm transition-colors"
                        >
                            <Lock className="h-4 w-4" />
                            Change Password
                        </button>
                    ) : (
                        <form onSubmit={handleChangePassword} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-medium text-sm text-zinc-300">Update Password</h3>
                                <button type="button" onClick={() => setPasswordMode(false)} className="text-zinc-500 hover:text-white">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <input
                                    type="password"
                                    placeholder="Current Password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2 text-white text-sm focus:outline-none focus:border-zinc-600"
                                />
                                <input
                                    type="password"
                                    placeholder="New Password (min 6 chars)"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2 text-white text-sm focus:outline-none focus:border-zinc-600"
                                />
                                <div className="flex items-center justify-between pt-2">
                                    <span className={`text-xs ${passwordMsg.includes("Error") ? "text-red-400" : "text-green-400"}`}>
                                        {passwordMsg}
                                    </span>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-500 transition-colors"
                                    >
                                        Update Password
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </section>

                {/* Danger Zone */}
                <section className="p-6 rounded-2xl border border-red-500/10 bg-red-500/5">
                    <h2 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h2>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-medium text-zinc-300">Sign Out</p>
                            <p className="text-sm text-zinc-500">Log out of your account on this device.</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-red-900/30 text-red-400 rounded-lg hover:bg-red-500/10 font-medium text-sm transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
