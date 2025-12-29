"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, ArrowRight, Loader2 } from "lucide-react";

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
        <main className="flex min-h-screen items-center justify-center bg-black text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] -z-10 animate-pulse" />

            <div className="w-full max-w-md p-8">
                <div className="mb-8 text-center animate-fade-in-up">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 mb-6 shadow-lg shadow-purple-500/20">
                        <Zap className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
                    <p className="text-zinc-400">Enter your credentials to access your account</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Email</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full rounded-lg bg-black/50 border border-white/10 px-4 py-3 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-zinc-600"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-zinc-300">Password</label>
                                <Link href="#" className="text-xs text-purple-400 hover:text-purple-300">Forgot password?</Link>
                            </div>
                            <input
                                type="password"
                                required
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full rounded-lg bg-black/50 border border-white/10 px-4 py-3 text-white outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-zinc-600"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full rounded-lg bg-white py-3 font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                            {!loading && <ArrowRight className="h-4 w-4" />}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-zinc-500">
                        Don't have an account?{" "}
                        <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                            Sign up for free
                        </Link>
                    </div>
                </div>
            </div>
        </main>
    );
}
