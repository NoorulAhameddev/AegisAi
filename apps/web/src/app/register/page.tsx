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
    <main className="flex min-h-screen items-center justify-center bg-ink-950 text-ink-100 relative overflow-hidden selection:bg-brand/25 font-sans antialiased">
      {/* Background dot grid */}
      <div className="fixed inset-0 bg-[radial-gradient(#f0ebe410_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none z-0" />

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="mb-8 text-center animate-slide-up">
          <Link href="/" className="inline-block group focus:outline-none focus:ring-2 focus:ring-brand/50 mb-6">
            <div className="mx-auto h-16 w-16 bg-ink-850 border border-ink-700 p-2 group-hover:border-brand/60 transition-colors flex items-center justify-center">
              <img
                src="/aegis-logo.png"
                alt="Aegis AI Logo"
                className="h-10 w-10 object-contain"
              />
            </div>
          </Link>
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/10 border border-brand/20 text-brand text-xs font-mono uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5" />
              Enterprise Account Setup
            </div>
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight mb-2 text-ink-100">
            Create Account
          </h1>
          <p className="text-ink-500 text-sm">
            Access secure vector search, SSE streaming, and BullMQ workers
          </p>
        </div>

        <GlassCard
          className="animate-slide-up [animation-delay:100ms] opacity-0 [animation-fill-mode:forwards] p-8 border-hair bg-ink-900"
          gradient="none"
          interactive={false}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex items-center justify-center font-medium">
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
              icon={<User className="h-5 w-5 text-zinc-500" />}
            />

            <Input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              label="Email Address"
              placeholder="name@company.com"
              icon={<Mail className="h-5 w-5 text-zinc-500" />}
            />

            <Input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              label="Password"
              placeholder="••••••••"
              icon={<Lock className="h-5 w-5 text-zinc-500" />}
              helperText="At least 8 characters recommended"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-6 bg-ink-100 text-ink-950 hover:bg-white font-medium"
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

        <div className="mt-8 text-center text-sm text-ink-500 animate-slide-up [animation-delay:200ms] opacity-0 [animation-fill-mode:forwards]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-ink-100 hover:text-brand font-medium transition-colors underline decoration-ink-700 underline-offset-4 hover:decoration-brand"
          >
            Sign in instead →
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-ink-500 font-mono animate-slide-up [animation-delay:250ms] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 bg-emerald-500" />
            <span>Developer Tier $0</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 bg-brand" />
            <span>No Credit Card Needed</span>
          </div>
        </div>
      </div>
    </main>
  );
}
