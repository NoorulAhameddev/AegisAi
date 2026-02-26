"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Lock, Mail, User, Sparkles, Shield } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        // Backend sets auth cookies automatically
        router.push("/dashboard");
        router.refresh(); // Refresh to update middleware state
      } else {
        const data = await res.json();
        setError(data.error || "Registration failed");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white relative overflow-hidden selection:bg-purple-500/30">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)] pointer-events-none" />
      <div className="absolute top-0 right-1/4 translate-x-1/2 w-150 h-150 bg-blue-500/20 rounded-full blur-[120px] -z-10 animate-pulse-slow" />
      <div className="absolute bottom-0 left-1/4 -translate-x-1/2 w-125 h-125 bg-purple-500/10 rounded-full blur-[100px] -z-10 animate-float-slow" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-blue-400/30 rounded-full animate-float" />
        <div className="absolute top-2/3 left-2/3 w-1.5 h-1.5 bg-purple-400/30 rounded-full animate-float-slow" />
        <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-emerald-400/30 rounded-full animate-bounce-subtle" />
      </div>

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="mb-8 text-center animate-slide-up">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-linear-to-tr from-blue-500 to-purple-600 p-px mb-6 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all">
            <div className="h-full w-full rounded-2xl bg-black flex items-center justify-center group-hover:bg-zinc-900 transition-colors">
              <img
                src="/aegis-logo.png"
                alt="Logo"
                className="h-10 w-10 object-contain"
              />
            </div>
          </div>
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs mb-4">
              <Shield className="h-3 w-3" />
              Protected Workspace
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-linear-to-b from-white via-white to-zinc-500">
            Create Account
          </h1>
          <p className="text-zinc-400 text-lg">Start your AI journey today</p>
        </div>

        <GlassCard
          className="animate-slide-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards] p-8"
          gradient="blue"
          interactive={false}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center justify-center font-medium animate-slide-up backdrop-blur-sm">
                <span className="mr-2">⚠️</span>
                {error}
              </div>
            )}

            <Input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              label="Full Name"
              placeholder="John Doe"
              icon={<User className="h-5 w-5" />}
            />

            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              label="Email Address"
              placeholder="name@company.com"
              icon={<Mail className="h-5 w-5" />}
            />

            <Input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              label="Password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5" />}
              helperText="At least 8 characters recommended"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-6"
              icon={
                !loading && (
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                )
              }
            >
              {loading ? "Creating account..." : "Get Started"}
            </Button>
          </form>
        </GlassCard>

        <div className="mt-8 text-center text-sm text-zinc-500 animate-slide-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-white hover:text-blue-300 font-medium transition-colors underline decoration-zinc-700 underline-offset-4 hover:decoration-blue-400"
          >
            Sign in instead →
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-zinc-600 animate-slide-up [animation-delay:250ms] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Free Forever</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            <span>No Credit Card</span>
          </div>
        </div>
      </div>
    </main>
  );
}
