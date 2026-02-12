"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, MessageSquare, Shield, Zap, Check, Menu, X, Globe, Cpu, Lock, Sparkles, Users, TrendingUp, Star, FileText, BarChart3, Brain, Database, CloudCog } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-300 h-150 bg-purple-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="absolute top-20 right-0 w-100 h-100 bg-blue-500/5 rounded-full blur-[100px] -z-10 animate-pulse-slow" />
        <div className="absolute top-40 left-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px] -z-10 animate-pulse-slow" style={{ animationDelay: '1s' }} />

        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs md:text-sm text-purple-300 mb-8 animate-fade-in hover:bg-white/10 transition-all cursor-default group">
            <Sparkles className="h-4 w-4 text-purple-400 group-hover:animate-spin" />
            <span className="font-semibold">Trusted by 10,000+ teams worldwide</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[0.9] animate-slide-up">
            Your Private <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400 animate-shimmer bg-[length:200%_auto]">
              AI Workspace
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-12 leading-relaxed animate-slide-up delay-75">
            Enterprise-grade AI that respects your privacy. Chat with documents, 
            automate workflows, and unlock insights—all within your secure environment.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-slide-up delay-100 mb-12">
            <Link
              href="/register"
              className="group relative px-10 py-5 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all active:scale-95 shadow-xl shadow-white/10 flex items-center justify-center min-w-50 overflow-hidden"
            >
              <span className="relative z-10">Start Free Trial</span>
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform relative z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="/login"
              className="px-10 py-5 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all font-bold min-w-55 flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-5 w-5" />
              Live Demo
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500 mb-16 animate-fade-in delay-150">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              <span>SOC 2 Type II compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-500" />
              <span>256-bit encryption</span>
            </div>
          </div>

          {/* Product Preview Mockup */}
          <div className="mt-20 md:mt-32 relative group animate-slide-up delay-150">
             <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000 animate-pulse-slow" />
             <div className="relative rounded-4xl border border-white/10 bg-zinc-900/50 backdrop-blur-3xl overflow-hidden shadow-2xl hover:shadow-purple-500/20 transition-shadow duration-500">
                <img 
                    src="/aegis_ai_mockup.png" 
                    alt="Aegis AI Platform Preview" 
                    className="w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700" 
                />
                
                {/* Floating Glass UI bits for visual flair */}
                <div className="hidden md:block absolute top-[10%] -left-10 h-32 w-48 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl transform -rotate-6 animate-float shadow-xl">
                  <div className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="h-2 w-20 bg-white/20 rounded mb-1.5" />
                      <div className="h-1.5 w-16 bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
                <div className="hidden md:block absolute bottom-[20%] -right-12 h-40 w-56 bg-purple-500/5 backdrop-blur-xl border border-white/10 rounded-2xl transform rotate-3 animate-float-slow shadow-xl">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-2 w-24 bg-white/20 rounded" />
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-1.5 w-full bg-white/10 rounded" />
                      <div className="h-1.5 w-3/4 bg-white/10 rounded" />
                      <div className="h-1.5 w-5/6 bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-gradient-to-b from-black to-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "10K+", label: "Active Teams", icon: Users },
              { value: "99.9%", label: "Uptime SLA", icon: TrendingUp },
              { value: "2M+", label: "Documents Analyzed", icon: FileText },
              { value: "150ms", label: "Avg Response Time", icon: Zap }
            ].map((stat, i) => (
              <div key={i} className="text-center group cursor-default">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white/5 border border-white/10 mb-4 group-hover:bg-white/10 group-hover:scale-110 transition-all">
                  <stat.icon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="text-3xl md:text-4xl font-black mb-2 bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="text-sm text-zinc-500 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative overflow-hidden bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-20 text-center max-w-3xl mx-auto">
             <h2 className="text-3xl md:text-6xl font-black tracking-tight mb-6">
               Powerful Features,<br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                 Simple Experience
               </span>
             </h2>
             <p className="text-zinc-400 text-lg md:text-xl">A unified ecosystem designed for precision, security, and performance.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {[
              {
                icon: Brain,
                title: "Advanced RAG",
                desc: "Intelligent document analysis with context-aware retrieval. Your data stays private while being instantly accessible.",
                color: "purple",
                features: ["Vector embeddings", "Semantic search", "Multi-document querying"]
              },
              {
                icon: Shield,
                title: "Military-Grade Security",
                desc: "SOC 2 Type II compliant encryption for every document, chat session, and API call.",
                color: "blue",
                features: ["End-to-end encryption", "Zero-knowledge architecture", "Audit logging"]
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Experience near-zero latency with our optimized AI streaming and caching infrastructure.",
                color: "emerald",
                features: ["Real-time responses", "Edge deployment", "Smart caching"]
              },
              {
                icon: Database,
                title: "Knowledge Base",
                desc: "Build your organization's intelligence hub with unlimited document storage and instant retrieval.",
                color: "orange",
                features: ["Unlimited storage", "Auto-indexing", "Version control"]
              },
              {
                icon: CloudCog,
                title: "Workflow Automation",
                desc: "Automate repetitive tasks with AI-powered workflows and custom integrations.",
                color: "pink",
                features: ["Custom workflows", "API integrations", "Scheduled tasks"]
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                desc: "Track usage, monitor performance, and gain insights into your AI operations.",
                color: "cyan",
                features: ["Real-time metrics", "Custom reports", "Export data"]
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group relative p-8 rounded-3xl bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-800/40 transition-all duration-300 hover:scale-105 cursor-default"
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 group-hover:-rotate-6",
                    feature.color === 'purple' ? "bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20" :
                    feature.color === 'blue' ? "bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20" : 
                    feature.color === 'emerald' ? "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20" :
                    feature.color === 'orange' ? "bg-orange-500/10 text-orange-400 group-hover:bg-orange-500/20" :
                    feature.color === 'pink' ? "bg-pink-500/10 text-pink-400 group-hover:bg-pink-500/20" :
                    "bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20"
                )}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-white transition-colors">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed mb-4">{feature.desc}</p>
                <ul className="space-y-2">
                  {feature.features.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Feature showcase */}
          <div className="mt-20 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold mb-6">
                Chat with Your <span className="text-purple-400">Documents</span>
              </h3>
              <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                Upload any document and instantly start asking questions. Our advanced RAG system 
                understands context, finds relevant information, and provides accurate answers 
                with source citations.
              </p>
              <div className="space-y-4">
                {[
                  { text: "PDF, Word, Excel, PowerPoint support", icon: FileText },
                  { text: "Multi-language document processing", icon: Globe },
                  { text: "Instant answers with citations", icon: MessageSquare }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-colors">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <item.icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <span className="font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 rounded-3xl blur-3xl" />
              <div className="relative p-8 rounded-3xl bg-zinc-900/50 border border-white/10 backdrop-blur-xl">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-purple-400">U</span>
                    </div>
                    <div className="flex-1 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                      <p className="text-sm">What were the key findings in Q4 report?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="flex-1 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm mb-2">The Q4 report highlights three key findings...</p>
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        <span>Source: Q4_Report_2025.pdf (Page 12)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 bg-gradient-to-b from-zinc-950/50 to-black">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Loved by Teams <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Worldwide</span>
            </h2>
            <p className="text-zinc-500 text-lg">See what our customers have to say</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "CTO, TechCorp",
                avatar: "SC",
                text: "Aegis AI transformed how our engineering team handles documentation. The RAG system is incredibly accurate and the security features give us peace of mind.",
                rating: 5
              },
              {
                name: "Michael Rodriguez",
                role: "Data Scientist, AI Labs",
                avatar: "MR",
                text: "Best AI platform I've used. The response times are blazing fast and the quality of answers is consistently high. Worth every penny.",
                rating: 5
              },
              {
                name: "Emily Watson",
                role: "Product Manager, StartupXYZ",
                avatar: "EW",
                text: "We migrated from ChatGPT to Aegis AI for privacy reasons. The transition was seamless and our team productivity has actually increased.",
                rating: 5
              }
            ].map((testimonial, i) => (
              <div key={i} className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-white/10 transition-all group">
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, idx) => (
                    <Star key={idx} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
                <p className="text-zinc-300 mb-6 leading-relaxed">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center font-bold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-zinc-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-black relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
           <div className="mb-20 text-center">
             <h2 className="text-3xl md:text-6xl font-black tracking-tight mb-6">
               Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">Transparent</span> Pricing
             </h2>
             <p className="text-zinc-400 text-lg md:text-xl">Choose the plan that scales with your ambition.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
             {/* Free Plan */}
             <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 flex flex-col h-full hover:border-white/10 transition-all group">
                <div className="mb-8">
                    <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Starter</span>
                    <h3 className="text-4xl font-black mt-3 mb-2">Free</h3>
                    <p className="text-zinc-500 text-sm">Perfect for individuals</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" /> 
                        <span>10 documents storage</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" /> 
                        <span>Basic AI models (GPT-3.5)</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" /> 
                        <span>50 messages per day</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" /> 
                        <span>Email support</span>
                    </li>
                </ul>
                <Link href="/register" className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold transition-all group-hover:scale-105">
                    Get Started Free
                </Link>
             </div>

             {/* Pro Plan */}
             <div className="p-8 rounded-3xl bg-gradient-to-b from-white/10 to-white/5 border-2 border-purple-500/50 relative flex flex-col h-full ring-4 ring-purple-500/10 scale-105 shadow-2xl shadow-purple-500/20 hover:shadow-purple-500/30 transition-all">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-full">
                  Most Popular
                </div>
                <div className="mb-8">
                    <span className="text-purple-400 text-sm font-bold uppercase tracking-widest">Professional</span>
                    <h3 className="text-4xl font-black mt-3 mb-2">
                      $29 
                      <span className="text-lg font-normal text-zinc-400">/month</span>
                    </h3>
                    <p className="text-zinc-400 text-sm">For power users and small teams</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-zinc-100">
                        <Check className="h-5 w-5 text-purple-400 flex-shrink-0" /> 
                        <span className="font-medium">Unlimited documents</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-100">
                        <Check className="h-5 w-5 text-purple-400 flex-shrink-0" /> 
                        <span className="font-medium">GPT-4o & Claude 3.5 Sonnet</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-100">
                        <Check className="h-5 w-5 text-purple-400 flex-shrink-0" /> 
                        <span className="font-medium">Priority processing</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-100">
                        <Check className="h-5 w-5 text-purple-400 flex-shrink-0" /> 
                        <span className="font-medium">Team collaboration (up to 5)</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-100">
                        <Check className="h-5 w-5 text-purple-400 flex-shrink-0" /> 
                        <span className="font-medium">Advanced analytics</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-100">
                        <Check className="h-5 w-5 text-purple-400 flex-shrink-0" /> 
                        <span className="font-medium">Priority support</span>
                    </li>
                </ul>
                <Link href="/register" className="w-full py-4 text-center rounded-2xl bg-white text-black font-black transition-all hover:bg-zinc-200 hover:scale-105 shadow-xl">
                    Start Pro Trial
                </Link>
             </div>

             {/* Enterprise */}
             <div className="p-8 rounded-3xl bg-zinc-900/30 border border-white/5 flex flex-col h-full hover:border-white/10 transition-all group">
                <div className="mb-8">
                    <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Enterprise</span>
                    <h3 className="text-4xl font-black mt-3 mb-2">Custom</h3>
                    <p className="text-zinc-500 text-sm">For large organizations</p>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-blue-500 flex-shrink-0" /> 
                        <span>On-premise deployment</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-blue-500 flex-shrink-0" /> 
                        <span>Custom AI models</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-blue-500 flex-shrink-0" /> 
                        <span>Advanced Admin SDK</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-blue-500 flex-shrink-0" /> 
                        <span>Unlimited team members</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-blue-500 flex-shrink-0" /> 
                        <span>SLA guarantee</span>
                    </li>
                    <li className="flex items-center gap-3 text-zinc-300">
                        <Check className="h-5 w-5 text-blue-500 flex-shrink-0" /> 
                        <span>24/7 Dedicated support</span>
                    </li>
                </ul>
                <button className="w-full py-4 text-center rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold transition-all group-hover:scale-105">
                    Contact Sales
                </button>
             </div>
          </div>

          {/* FAQ hint */}
          <div className="mt-16 text-center">
            <p className="text-zinc-500">
              All plans include 14-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 border-t border-white/5 relative overflow-hidden">
         <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/10 to-black" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-500/10 rounded-full blur-[150px]" />
         
         <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-purple-300 mb-8">
              <Sparkles className="h-4 w-4" />
              Join 10,000+ teams already using Aegis AI
            </div>
            
            <h2 className="text-4xl md:text-7xl font-black mb-6 tracking-tight">
              Ready to Transform <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-emerald-400">
                Your Workflow?
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Start your free trial today. No credit card required. 
              Experience the future of private AI.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link 
                href="/register" 
                className="group inline-flex items-center gap-2 px-10 py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all shadow-2xl shadow-white/10 active:scale-95 hover:scale-105"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 px-10 py-5 bg-white/5 border border-white/10 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all"
              >
                <MessageSquare className="h-5 w-5" />
                Try Demo
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
         </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-12 text-zinc-500 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 font-bold text-white mb-6">
                <ImgIcon /> 
                <span className="text-xl">Aegis AI</span>
              </div>
              <p className="max-w-xs leading-relaxed mb-6">
                The next generation intelligence platform for modern engineering teams. 
                Secure, private, and powerful.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"/></svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="#" className="h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-4">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link href="/knowledge" className="hover:text-white transition-colors">Knowledge Base</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Resources</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Tutorials</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6 text-sm uppercase tracking-wider">Company</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
            <p>&copy; 2026 Aegis AI. All rights reserved. Built for the future of data.</p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                SOC 2 Certified
              </span>
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                GDPR Compliant
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ImgIcon() {
    return (
        <div className="h-6 w-6 bg-linear-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center p-px">
            <div className="h-full w-full bg-black rounded-md flex items-center justify-center p-0.5">
                <img src="/aegis-logo.png" alt="" className="h-full w-full object-contain" />
            </div>
        </div>
    );
}
