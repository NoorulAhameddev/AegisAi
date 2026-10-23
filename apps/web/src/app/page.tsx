"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Menu,
  X,
  Shield,
  Zap,
  Database,
  Server,
  FileText,
  Layers,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ARCH_SECTIONS = [
  {
    id: "rag",
    eyebrow: "Vector Retrieval",
    title: "Context-aware RAG engine",
    desc: "Semantic vector search across PDFs, spreadsheets, and technical docs with page-level citations.",
    endpoint: "pgvector + embeddings",
    code: `// 1. Vector Search Query
const chunks = await prisma.documentChunk.findMany({
  where: { documentId: doc.id },
  orderBy: { similarity: 'desc' },
  take: 5,
});

// 2. Format Context & Citation Metadata
const promptContext = chunks.map(c =>
  \`[Source: \${c.documentName} P.\${c.pageIndex}]: \${c.content}\`
).join('\\n');`,
  },
  {
    id: "sse",
    eyebrow: "Real-time Stream",
    title: "Server-sent events, direct to the client",
    desc: "Zero-latency token streaming over a single HTTP connection. No worker polling bottleneck.",
    endpoint: "/api/chat/stream-sse",
    code: `// Zero-Worker Direct SSE Endpoint
export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of openaiStream) {
        controller.enqueue(encoder.encode(\`data: \${JSON.stringify(chunk)}\\n\\n\`));
      }
    }
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
}`,
  },
  {
    id: "workers",
    eyebrow: "Background Isolation",
    title: "BullMQ worker queues",
    desc: "Long-running ingestion and LLM calls are offloaded to Redis-backed workers, isolated from the API layer.",
    endpoint: "BullMQ + Redis worker",
    code: `// Async Task Worker Queue
const worker = new Worker('chat-tasks', async (job) => {
  const { prompt, documentIds } = job.data;
  await processBatchEmbeddings(documentIds);
  await executeLongRunningLLMTask(prompt);
}, { connection: redisConfig });`,
  },
  {
    id: "security",
    eyebrow: "Tenant Guardrails",
    title: "Zero-trust ownership model",
    desc: "Row-level tenant enforcement at the database, encrypted secret storage, JWT rotation, audit logs.",
    endpoint: "Encrypted enterprise storage",
    code: `// Tenant Isolation Guard
const userAuth = await verifyJWT(req);
const document = await prisma.document.findFirst({
  where: { id: docId, userId: userAuth.userId }, // Strict Ownership
});
if (!document) throw new UnauthorizedError();`,
  },
];

const FEATURES = [
  {
    title: "Document RAG engine",
    desc: "Vector chunking, semantic search, and context extraction across complex multi-page files.",
  },
  {
    title: "Instant SSE streaming",
    desc: "Sub-second time-to-first-token over HTTP server-sent events, no polling.",
  },
  {
    title: "Worker-queued workflows",
    desc: "OCR, vector re-indexing, and batch tasks run in BullMQ workers, never in the request path.",
  },
  {
    title: "Tenant isolation",
    desc: "Database-level row enforcement and zero-trust document ownership boundaries.",
  },
];

const STATS = [
  { value: "150ms", label: "time to first token" },
  { value: "100%", label: "tenant-isolated by default" },
  { value: "5+", label: "document formats ingested" },
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeArch, setActiveArch] = useState("rag");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? window.scrollY / total : 0);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const activate = () => {
      document.querySelectorAll(".reveal").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) el.classList.add("visible");
      });
    };
    activate();
    window.addEventListener("scroll", activate, { passive: true });
    return () => window.removeEventListener("scroll", activate);
  }, []);

  const activeArchData =
    ARCH_SECTIONS.find((a) => a.id === activeArch) || ARCH_SECTIONS[0];

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 font-sans antialiased overflow-x-hidden selection:bg-brand/25">
      <div
        className="scroll-progress"
        style={{ transform: `scaleX(${progress})` }}
      />

      {/* Header Navigation */}
      <header className="relative z-50">
        <nav
          className={cn(
            "fixed top-0 w-full transition-all duration-300 border-b",
            isScrolled
              ? "bg-ink-950/90 backdrop-blur-md border-hair py-4"
              : "bg-transparent border-transparent py-6",
          )}
        >
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="h-9 w-9 bg-ink-850 border border-ink-700 flex items-center justify-center p-1.5 transition-colors group-hover:border-brand/50">
                <img
                  src="/aegis-logo.png"
                  alt="Aegis AI Enterprise Workspace Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="font-display font-medium text-xl tracking-tight text-ink-100 group-hover:text-brand transition-colors">
                Aegis AI
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-500">
              <Link href="#architecture" className="hover:text-ink-100 transition-colors">
                Architecture
              </Link>
              <Link href="#features" className="hover:text-ink-100 transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="hover:text-ink-100 transition-colors">
                Pricing
              </Link>
              <Link href="/api-docs" className="hover:text-ink-100 transition-colors">
                API Docs
              </Link>
              <Link
                href="/login"
                className="hover:text-ink-100 transition-colors border-l border-hair pl-8"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn-bracket px-5 py-2.5 bg-brand text-ink-950 font-medium hover:bg-brand-dim transition-colors"
              >
                Deploy Workspace
              </Link>
            </div>

            <button
              className="md:hidden p-2.5 text-ink-400 hover:text-ink-100 border border-hair bg-ink-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Navigation */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-ink-950/95 backdrop-blur-2xl md:hidden transition-all duration-300",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8 text-xl font-medium text-ink-300">
          <Link href="#architecture" onClick={() => setMobileMenuOpen(false)}>
            Architecture
          </Link>
          <Link href="#features" onClick={() => setMobileMenuOpen(false)}>
            Features
          </Link>
          <Link href="#pricing" onClick={() => setMobileMenuOpen(false)}>
            Pricing
          </Link>
          <Link href="/api-docs" onClick={() => setMobileMenuOpen(false)}>
            API Documentation
          </Link>
          <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-bracket px-8 py-3.5 bg-brand text-ink-950 font-medium"
            onClick={() => setMobileMenuOpen(false)}
          >
            Deploy Workspace
          </Link>
        </div>
      </div>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="pt-40 pb-24 md:pt-52 md:pb-32 relative overflow-hidden">
          <div className="absolute inset-0 grid-texture opacity-40 pointer-events-none" />
          <div className="absolute -top-10 left-0 w-full overflow-hidden pointer-events-none select-none" aria-hidden>
            <span className="bg-type block text-center">AEGIS</span>
          </div>
          <div className="max-w-7xl mx-auto px-6 relative">
            <div className="max-w-4xl mx-auto text-center">
              <p className="eyebrow mb-8 reveal">
                Worker-backed enterprise AI · Async BullMQ + SSE
              </p>

              <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight mb-8 leading-[1.08] text-ink-100 reveal reveal-delay-1">
                Enterprise private AI, engineered for zero leakage.
              </h1>

              <p className="text-lg md:text-xl text-ink-500 max-w-2xl mx-auto mb-12 leading-relaxed reveal reveal-delay-2">
                Context-aware RAG, real-time SSE completions, and isolated
                background workers — self-hosted or in your own cloud.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 reveal reveal-delay-3">
                <Link
                  href="/register"
                  className="btn-bracket group w-full sm:w-auto px-8 py-4 bg-brand text-ink-950 font-medium hover:bg-brand-dim transition-colors flex items-center justify-center gap-2"
                >
                  Deploy Workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/api-docs"
                  className="w-full sm:w-auto px-8 py-4 border border-hair text-ink-300 font-medium hover:border-ink-600 hover:text-ink-100 transition-colors flex items-center justify-center gap-2"
                >
                  Read the API docs
                </Link>
              </div>

              {/* Stat row — vertical dividers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-hair border-t border-hair pt-10 text-left reveal reveal-delay-4">
                {STATS.map((s) => (
                  <div key={s.label} className="py-4 sm:py-0 sm:px-8 first:pl-0">
                    <div className="font-display text-3xl md:text-4xl font-medium tracking-tight text-ink-100">
                      {s.value}
                    </div>
                    <p className="text-xs text-ink-500 mt-1 font-mono uppercase tracking-widest">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Product Preview Interface Showcase */}
            <div className="mt-20 terminal-frame reveal">
              <div className="terminal-bar">
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span className="terminal-dot" />
                <span className="ml-3 text-xs text-ink-500 font-mono">
                  aegis-ai // private-workspace.v1
                </span>
                <span className="ml-auto flex items-center gap-2 text-xs text-ink-500 font-mono">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  worker active
                </span>
              </div>

              <div className="p-6 md:p-8">
                <img
                  src="/aegis_ai_mockup.png"
                  alt="Aegis AI Private Document Chat & RAG Workspace Screenshot"
                  className="w-full h-auto border border-ink-800 object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Technical Architecture Section */}
        <section id="architecture" className="py-24 md:py-32 border-t border-hair">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-3xl">
              <p className="eyebrow mb-4">01 / Architecture</p>
              <h2 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-ink-100 mb-6">
                Built for reliability, not wrappers.
              </h2>
              <p className="text-ink-500 text-lg leading-relaxed">
                Aegis separates heavy background inferencing from stateless API
                routes using an asynchronous queue-first pattern.
              </p>
            </div>

            {/* Architectural list — left-border insets, not tabs */}
            <div className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-5 space-y-1">
                {ARCH_SECTIONS.map((arch) => (
                  <button
                    key={arch.id}
                    onClick={() => setActiveArch(arch.id)}
                    className={cn(
                      "w-full text-left p-5 border-l-2 transition-colors",
                      activeArch === arch.id
                        ? "border-l-brand bg-white/5 text-ink-100"
                        : "border-l-hair text-ink-400 hover:border-l-ink-600 hover:text-ink-300",
                    )}
                  >
                    <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-brand mb-1">
                      {arch.eyebrow}
                    </p>
                    <h3 className="font-display font-medium text-base text-ink-100 mb-1">
                      {arch.title}
                    </h3>
                    <p className="text-xs text-ink-500 leading-relaxed">
                      {arch.desc}
                    </p>
                  </button>
                ))}
              </div>

              {/* Architecture code window */}
              <div className="md:col-span-7 terminal-frame font-mono text-sm min-h-[380px] flex flex-col">
                <div className="terminal-bar">
                  <span className="text-xs text-ink-500">{activeArchData.eyebrow}</span>
                  <span className="ml-auto text-xs text-brand">{activeArchData.endpoint}</span>
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-between gap-6">
                  <pre className="text-xs text-ink-300 leading-relaxed overflow-x-auto p-4 bg-ink-950 border border-ink-800">
                    <code>{activeArchData.code}</code>
                  </pre>
                  <div className="flex items-center gap-6 text-xs text-ink-500 font-sans">
                    <span className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-brand" />
                      Exact page-level citations
                    </span>
                    <span className="flex items-center gap-2">
                      <Zap className="h-3.5 w-3.5 text-brand" />
                      Sub-150ms time to first token
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature List Section */}
        <section id="features" className="py-24 md:py-32 border-t border-hair">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-3xl">
              <p className="eyebrow mb-4">02 / Capabilities</p>
              <h2 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-ink-100 mb-6">
                What the platform gives you.
              </h2>
            </div>

            <div className="divide-y divide-hair border-t border-hair">
              {FEATURES.map((feat) => (
                <div
                  key={feat.title}
                  className="grid md:grid-cols-12 gap-4 py-8 md:py-10 items-baseline group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="md:col-span-4">
                    <span className="flex items-center gap-3 font-display text-xl font-medium tracking-tight text-ink-100">
                      <FileText className="h-4 w-4 text-brand shrink-0" />
                      {feat.title}
                    </span>
                  </div>
                  <p className="md:col-span-7 md:col-start-6 text-ink-500 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 md:py-32 border-t border-hair">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 max-w-3xl">
              <p className="eyebrow mb-4">03 / Pricing</p>
              <h2 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-ink-100 mb-6">
                Transparent, predictable plans.
              </h2>
              <p className="text-ink-500 text-lg leading-relaxed">
                Scale with seat pricing, or deploy self-hosted enterprise nodes.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-px bg-hair border border-hair">
              {/* Developer Plan */}
              <div className="bg-ink-950 p-8 flex flex-col justify-between">
                <div>
                  <p className="eyebrow mb-6">Developer</p>
                  <div className="font-display text-4xl font-medium text-ink-100 mb-2">
                    $0
                  </div>
                  <p className="text-xs text-ink-500 mb-8">
                    For local testing and personal RAG setups.
                  </p>
                  <ul className="space-y-3 text-sm text-ink-300 border-t border-hair pt-6">
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Up to 10 document uploads
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Direct SSE stream endpoint
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Standard vector search
                    </li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="btn-bracket w-full mt-8 py-3.5 text-center border border-hair text-ink-300 hover:border-ink-600 hover:text-ink-100 transition-colors"
                >
                  Start free
                </Link>
              </div>

              {/* Team Pro Plan */}
              <div className="bg-ink-900 p-8 flex flex-col justify-between relative">
                <div>
                  <p className="eyebrow mb-6">Team Pro · Recommended</p>
                  <div className="font-display text-4xl font-medium text-ink-100 mb-2">
                    $29 <span className="text-sm font-normal text-ink-500 font-sans">/ seat / mo</span>
                  </div>
                  <p className="text-xs text-ink-500 mb-8">
                    For engineering teams running dedicated worker queues.
                  </p>
                  <ul className="space-y-3 text-sm text-ink-200 border-t border-hair pt-6">
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Unlimited document storage
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Dedicated Redis BullMQ queue
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      High-density vector embeddings
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Team role management & audit logs
                    </li>
                  </ul>
                </div>
                <Link
                  href="/register"
                  className="btn-bracket w-full mt-8 py-3.5 text-center bg-brand text-ink-950 font-medium hover:bg-brand-dim transition-colors"
                >
                  Start pro trial
                </Link>
              </div>

              {/* Dedicated Enterprise Plan */}
              <div className="bg-ink-950 p-8 flex flex-col justify-between">
                <div>
                  <p className="eyebrow mb-6">Enterprise</p>
                  <div className="font-display text-4xl font-medium text-ink-100 mb-2">
                    Custom
                  </div>
                  <p className="text-xs text-ink-500 mb-8">
                    Self-hosted or isolated cloud deployment.
                  </p>
                  <ul className="space-y-3 text-sm text-ink-300 border-t border-hair pt-6">
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      On-premise / VPC Kubernetes deployment
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Custom LLM & local embedding models
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="h-1 w-1 bg-brand" />
                      Dedicated support & SLA guarantee
                    </li>
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="btn-bracket w-full mt-8 py-3.5 text-center border border-hair text-ink-300 hover:border-ink-600 hover:text-ink-100 transition-colors"
                >
                  Contact engineering
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Final Action Callout */}
        <section className="py-24 md:py-32 border-t border-hair text-center relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full overflow-hidden pointer-events-none select-none" aria-hidden>
            <span className="bg-type block text-center">AEGIS</span>
          </div>
          <div className="max-w-4xl mx-auto px-6 relative">
            <p className="eyebrow mb-6">Ship it</p>
            <h2 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-ink-100 mb-8">
              Private RAG and low-latency streaming in under five minutes.
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="btn-bracket w-full sm:w-auto px-8 py-4 bg-brand text-ink-950 font-medium hover:bg-brand-dim transition-colors flex items-center justify-center gap-2"
              >
                Deploy Aegis AI
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/api-docs"
                className="w-full sm:w-auto px-8 py-4 border border-hair text-ink-300 font-medium hover:border-ink-600 hover:text-ink-100 transition-colors flex items-center justify-center"
              >
                Read the API docs
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-hair text-ink-500 text-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 font-medium text-ink-100">
                <div className="h-6 w-6 bg-ink-850 border border-ink-700 flex items-center justify-center p-1">
                  <img src="/aegis-logo.png" alt="Aegis AI Logo" className="h-full w-full object-contain" />
                </div>
                <span className="font-display tracking-tight">Aegis AI</span>
              </div>
              <p className="text-xs text-ink-400 leading-relaxed max-w-xs">
                Private, worker-backed enterprise AI chat and context-aware RAG platform.
              </p>
            </div>

            <div>
              <h4 className="eyebrow mb-4">Product</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link href="#architecture" className="hover:text-ink-200 transition-colors">Architecture</Link></li>
                <li><Link href="#features" className="hover:text-ink-200 transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="hover:text-ink-200 transition-colors">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-ink-200 transition-colors">Console Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="eyebrow mb-4">Documentation</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link href="/api-docs" className="hover:text-ink-200 transition-colors">API Reference</Link></li>
                <li><Link href="/knowledge" className="hover:text-ink-200 transition-colors">RAG Setup Guide</Link></li>
                <li><Link href="/study" className="hover:text-ink-200 transition-colors">Worker Queue Specs</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="eyebrow mb-4">Legal & Trust</h4>
              <ul className="space-y-2.5 text-xs">
                <li><Link href="/maintenance" className="hover:text-ink-200 transition-colors">System Status</Link></li>
                <li><Link href="/login" className="hover:text-ink-200 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/register" className="hover:text-ink-200 transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-hair flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-500">
            <p>&copy; {new Date().getFullYear()} Aegis AI Engineering. Enterprise Async Workspace.</p>
            <div className="flex items-center gap-6 font-mono uppercase tracking-widest text-[0.65rem]">
              <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-brand" /> SOC 2 Type II Ready</span>
              <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-brand" /> Zero-knowledge storage</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
