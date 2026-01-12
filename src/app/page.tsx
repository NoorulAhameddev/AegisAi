"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Shield, Zap, Check, Menu, X, Globe, Cpu, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30 overflow-x-hidden">
      {/* Navbar */}
      <nav className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/5 py-4" : "bg-transparent py-6"
      )}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="h-9 w-9 bg-linear-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center p-px transition-transform group-hover:scale-110">
                <div className="h-full w-full bg-black rounded-[10px] flex items-center justify-center">
                    <img src="/aegis-logo.png" alt="Aegis AI Logo" className="h-5 w-5 object-contain" />
                </div>
            </div>
            <span className="font-bold text-xl tracking-tighter">Aegis AI</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="text-zinc-400 hover:text-white transition-colors border-l border-white/10 pl-8">Sign in</Link>
            <Link
              href="/register"
              className="px-5 py-2.5 bg-white text-black rounded-full hover:bg-zinc-200 transition-all active:scale-95 font-bold shadow-lg shadow-white/5"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 text-zinc-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={cn(
          "fixed inset-0 z-40 bg-black/95 backdrop-blur-2xl md:hidden transition-all duration-500",
          mobileMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
      )}>
          <div className="flex flex-col items-center justify-center h-full gap-8 text-2xl font-bold">
              <Link href="#features" onClick={() => setMobileMenuOpen(false)}>Features</Link>
              <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Sign In</Link>
              <Link href="/register" className="px-8 py-4 bg-white text-black rounded-full" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
          </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-56 md:pb-40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10 animate-pulse-slow" />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs md:text-sm text-purple-300 mb-8 animate-fade-in">
            <Globe className="h-3 w-3" />
            Empowering modern teams worldwide
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] animate-slide-up">
            Intelligence <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-blue-400 to-emerald-400">
              Redefined.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up delay-75">
            The private, enterprise-grade AI interface for your most sensitive data. 
            Chat, analyze, and automate without compromise.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-slide-up delay-100">
            <Link
              href="/register"
              className="group relative px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/10 flex items-center justify-center min-w-[200px]"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="px-10 py-5 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl hover:bg-white/10 transition-all font-bold min-w-[200px]"
            >
              Live Experience
            </Link>
          </div>

          {/* Product Preview Mockup */}
          <div className="mt-20 md:mt-32 relative group animate-slide-up delay-150">
             <div className="absolute -inset-1 bg-linear-to-r from-purple-500/20 to-blue-500/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
             <div className="relative rounded-[2rem] border border-white/10 bg-zinc-900/50 backdrop-blur-3xl overflow-hidden shadow-2xl">
                <img 
                    src="/aegis_ai_mockup.png" 
                    alt="Aegis AI Platform Preview" 
                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700" 
                />
                
                {/* Floating Glass UI bits for visual flair */}
                <div className="hidden md:block absolute top-[10%] -left-10 h-32 w-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl transform -rotate-6 animate-float" />
                <div className="hidden md:block absolute bottom-[20%] -right-12 h-40 w-56 bg-purple-500/5 backdrop-blur-xl border border-white/10 rounded-2xl transform rotate-3 animate-float-slow" />
             </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative overflow-hidden bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20 text-center max-w-2xl mx-auto">
             <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Everything you need</h2>
             <p className="text-zinc-500 text-lg">A unified ecosystem designed for precision and performance.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Cpu,
                title: "Advanced RAG",
                desc: "Your data stays private while being indexed for instant context-aware retrieval.",
                color: "purple"
              },
              {
                icon: Shield,
                title: "Military-Grade",
                desc: "SOC 2 Type II compliant encryption for every document and chat session.",
                color: "blue"
              },
              {
                icon: Zap,
                title: "Turbo Streaming",
                desc: "Experience zero latency with our hyper-optimized message delivery queue.",
                color: "emerald"
              }
            ].map((feature, i) => (
              <div key={i} className="group relative p-8 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-800/40 transition-all duration-300">
                <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 group-hover:-rotate-3",
                    feature.color === 'purple' ? "bg-purple-500/10 text-purple-400" :
                    feature.color === 'blue' ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                )}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed text-lg">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-black">
        <div className="max-w-7xl mx-auto px-6">
           <div className="mb-20 text-center">
             <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Straightforward Pricing</h2>
             <p className="text-zinc-500 text-lg">Choose the plan that fits your ambition.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
             {/* Free Plan */}
             <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 flex flex-col h-full">
                <div className="mb-8">
                    <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Individual</span>
                    <h3 className="text-3xl font-bold mt-2">Free</h3>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-zinc-400">
                        <Check className="h-5 w-5 text-emerald-500" /> 10 files storage
                    </li>
                    <li className="flex items-center gap-3 text-zinc-400">
                        <Check className="h-5 w-5 text-emerald-500" /> Basic AI models
                    </li>
                    <li className="flex items-center gap-3 text-zinc-400">
                        <Check className="h-5 w-5 text-emerald-500" /> 50 msgs / day
                    </li>
                </ul>
                <Link href="/register" className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold transition-all">
                    Choose Free
                </Link>
             </div>

             {/* Pro Plan */}
             <div className="p-8 rounded-3xl bg-white/5 border-2 border-purple-500/50 relative flex flex-col h-full ring-4 ring-purple-500/10 scale-105 shadow-2xl shadow-purple-500/20">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-purple-500 text-white text-[10px] font-black uppercase tracking-tighter rounded-full">Most Popular</div>
                <div className="mb-8">
                    <span className="text-purple-400 text-sm font-bold uppercase tracking-widest">Power User</span>
                    <h3 className="text-3xl font-bold mt-2">$29 <span className="text-sm font-normal text-zinc-500">/mo</span></h3>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-zinc-200">
                        <Check className="h-5 w-5 text-purple-400" /> Unlimited files
                    </li>
                    <li className="flex items-center gap-3 text-zinc-200">
                        <Check className="h-5 w-5 text-purple-400" /> GPT-4o & Claude 3.5
                    </li>
                    <li className="flex items-center gap-3 text-zinc-200">
                        <Check className="h-5 w-5 text-purple-400" /> Priority processing
                    </li>
                    <li className="flex items-center gap-3 text-zinc-200">
                        <Check className="h-5 w-5 text-purple-400" /> Team collaboration
                    </li>
                </ul>
                <Link href="/register" className="w-full py-4 text-center rounded-2xl bg-white text-black font-black transition-all hover:bg-zinc-200">
                    Get Started Pro
                </Link>
             </div>

             {/* Enterprise */}
             <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 flex flex-col h-full">
                <div className="mb-8">
                    <span className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Organization</span>
                    <h3 className="text-3xl font-bold mt-2">Custom</h3>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-zinc-400">
                        <Check className="h-5 w-5 text-blue-500" /> On-prem deployment
                    </li>
                    <li className="flex items-center gap-3 text-zinc-400">
                        <Check className="h-5 w-5 text-blue-500" /> Advanced Admin SDK
                    </li>
                    <li className="flex items-center gap-3 text-zinc-400">
                        <Check className="h-5 w-5 text-blue-500" /> 24/7 Dedicated rep
                    </li>
                </ul>
                <button className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold transition-all">
                    Contact Sales
                </button>
             </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 border-t border-white/5">
         <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-4xl md:text-6xl font-black mb-8">Ready to step into <br /> <span className="text-zinc-500">the future?</span></h2>
            <Link href="/register" className="inline-flex px-12 py-6 bg-white text-black rounded-3xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-white/10 active:scale-95">
                Join Aegis AI Now
            </Link>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 text-zinc-500">
          <div className="col-span-2">
            <div className="flex items-center gap-2 font-bold text-white mb-6">
              <ImgIcon /> Aegis AI
            </div>
            <p className="max-w-xs leading-relaxed">
              The next generation intelligence platform for modern engineering teams.
            </p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">API Docs</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 text-sm text-zinc-700">
           &copy; 2026 Aegis AI. All rights reserved. Built for the future of data.
        </div>
      </footer>
    </div>
  );
}

function ImgIcon() {
    return (
        <div className="h-6 w-6 bg-linear-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center p-px">
            <div className="h-full w-full bg-black rounded-[6px] flex items-center justify-center p-0.5">
                <img src="/aegis-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
        </div>
    );
}
