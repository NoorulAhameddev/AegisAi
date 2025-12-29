"use client";

import Link from "next/link";
import { ArrowRight, MessageSquare, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
              <Zap className="h-5 w-5 text-white fill-current" />
            </div>
            Aegis AI
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="text-white hover:text-purple-400 transition-colors">Sign in</Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-white text-black rounded-full hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm md:text-base text-purple-300 mb-8 animate-fade-in-up">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
            Now with GPT-4o & RAG Support
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            Chat with your Data <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
              Intelligently.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Experience the next generation of AI chat. Upload documents, analyze data, and get answers in seconds. Enterprise-grade security included.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-all active:scale-95"
            >
              Start for Free
              <ArrowRight className="inline-block ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-zinc-900 border border-zinc-800 rounded-full hover:bg-zinc-800 transition-all font-medium"
            >
              Live Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-zinc-900/30 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: "Real-time Chat",
                desc: "Zero-latency streaming responses powered by the latest LLMs."
              },
              {
                icon: Shield,
                title: "Enterprise Security",
                desc: "Bank-grade encryption, JWT sessions, and strict rate limiting."
              },
              {
                icon: Zap,
                title: "Usage Analytics",
                desc: "Track every token and user interaction with detailed admin dashboards."
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-colors group">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-400 group-hover:text-purple-300 transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
