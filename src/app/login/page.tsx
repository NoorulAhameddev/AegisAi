"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                router.push("/dashboard");
            } else {
                const data = await res.json();
                setError(data.error || "Login failed");
            }
        } catch {
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-black text-white relative overflow-hidden selection:bg-purple-500/30">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('/bg-noise.png')] opacity-20 pointer-events-none" />
            <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
            <div className="absolute bottom-0 right-1/4 translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

            <div className="w-full max-w-md p-6 relative z-10">
                <div className="mb-8 text-center animate-slide-up">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-linear-to-tr from-purple-500 to-blue-600 p-px mb-6">
                        <div className="h-full w-full rounded-2xl bg-black flex items-center justify-center">
                             <img src="/aegis-logo.png" alt="Logo" className="h-10 w-10 object-contain" />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-400">
                        Welcome back
                    </h1>
                    <p className="text-zinc-400 text-lg">Sign in to continue to Aegis AI</p>
                </div>

                <GlassCard className="animate-slide-up [animation-delay:100ms] opacity-0 fill-mode-forwards p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center justify-center font-medium">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300 ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-10 py-3 text-white outline-none focus:border-purple-500/50 focus:bg-black/60 focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-zinc-600"
                                    placeholder="name@company.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                             <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-zinc-300">Password</label>
                                <Link href="#" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Forgot password?</Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full rounded-xl bg-black/40 border border-white/10 px-10 py-3 text-white outline-none focus:border-purple-500/50 focus:bg-black/60 focus:ring-4 focus:ring-purple-500/10 transition-all placeholder:text-zinc-600"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="group w-full rounded-xl bg-white py-3.5 font-bold text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-white/5 active:scale-95"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
                            {!loading && <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />}
                        </button>
                    </form>
                </GlassCard>

                <div className="mt-8 text-center text-sm text-zinc-500 animate-slide-up [animation-delay:200ms] opacity-0 fill-mode-forwards">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-white hover:text-purple-300 font-medium transition-colors underline decoration-zinc-700 underline-offset-4 hover:decoration-purple-400">
                        Create one now
                    </Link>
                </div>
            </div>
        </main>
    );
}
