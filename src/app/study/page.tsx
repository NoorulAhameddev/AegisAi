export default function StudyPage() {
  const studyFeatures = [
    {
      title: "Flashcards",
      description: "Generate quick flashcards from your notes and files.",
      href: "/chat",
    },
    {
      title: "Quizzes",
      description: "Create practice quizzes to self-test key concepts.",
      href: "/chat",
    },
    {
      title: "Exam Notes",
      description: "Condense long content into exam-ready notes.",
      href: "/chat",
    },
    {
      title: "Questions",
      description: "Brainstorm study questions from any document.",
      href: "/chat",
    },
  ];

  const quickActions = [
    {
      title: "Start study chat",
      description: "Chat with documents, stream answers, and generate summaries, notes, and QA.",
      href: "/chat",
      badge: "Ready",
    },
    {
      title: "Upload & ingest",
      description: "PDF, DOCX, TXT/MD, audio, images with OCR, URLs, and batch uploads (LanceDB backed).",
      href: "/files",
      badge: "Ready",
    },
    {
      title: "Manage knowledge",
      description: "Projects, namespaces, semantic search, and per-user isolation for stored embeddings.",
      href: "/knowledge",
      badge: "Ready",
    },
  ];

  const pipelineStats = [
    {
      label: "Features shipped",
      value: "90 / 90",
      helper: "Input → RAG → Study → Export",
    },
    {
      label: "Security",
      value: "Auth • RBAC • Audit",
      helper: "Encryption at rest + quotas",
    },
    {
      label: "Exports",
      value: "PDF / MD / DOCX",
      helper: "Notes + chat transcripts",
    },
  ];

  const capabilitySections = [
    {
      title: "A. Input & Ingestion",
      icon: "🧩",
      summary: "Multi-source ingestion with OCR and batch processing.",
      items: [
        "Text input (manual paste)",
        "File upload: PDF",
        "File upload: DOCX",
        "File upload: TXT / Markdown",
        "YouTube URL ingestion",
        "Web page URL ingestion",
        "Audio file upload (MP3/WAV)",
        "Image upload (OCR from image)",
        "Batch upload (multiple files at once)",
      ],
    },
    {
      title: "B. Extraction & Preprocessing",
      icon: "🔍",
      summary: "Clean, normalize, and enrich text before embedding.",
      items: [
        "PDF text extraction",
        "OCR for scanned PDFs",
        "YouTube transcript extraction",
        "Audio → text transcription",
        "Timestamp cleaning (YT/audio)",
        "Language detection",
        "Text normalization (remove noise)",
        "Metadata extraction (title, author, duration)",
      ],
    },
    {
      title: "C. Chunking & Token Management",
      icon: "✂️",
      summary: "Token-aware chunking tuned for retrieval quality.",
      items: [
        "Fixed-size chunking",
        "Recursive chunking (semantic-aware)",
        "Overlapping chunks",
        "Token limit enforcement",
        "Chunk metadata tagging",
        "Chunk preview/debug mode",
      ],
    },
    {
      title: "D. Core AI Capabilities",
      icon: "🧠",
      summary: "Study-first AI transforms across notes, QA, and rewriting.",
      items: [
        "Summarization (short)",
        "Summarization (detailed)",
        "Structured notes generation",
        "Bullet-point extraction",
        "Key concept extraction",
        "Definitions & glossary generation",
        "Examples generation",
        "Simplified explanation (ELI5)",
        "Question answering from content",
        "Content rewriting / transformation",
      ],
    },
    {
      title: "E. RAG (Retrieval-Augmented Generation)",
      icon: "📚",
      summary: "Per-user LanceDB namespaces with semantic search and citations.",
      items: [
        "Vector embedding generation",
        "Vector storage (per document)",
        "Per-user namespace isolation",
        "Per-project namespace",
        "Semantic search",
        "Top-K retrieval",
        "Context-only answering (no hallucination mode)",
        "Source citation in answers",
        "Document-scoped chat",
        "Multi-document chat",
      ],
    },
    {
      title: "F. Memory & Storage",
      icon: "🗂️",
      summary: "Persistent notes, chat history, tagging, and versioning.",
      items: [
        "Save generated notes",
        "Save summaries",
        "Save chat history",
        "Versioning of notes",
        "Re-run pipeline with updated prompts",
        "Tagging & labeling documents",
        "Delete / purge data (hard delete)",
      ],
    },
    {
      title: "G. Chat & Interaction",
      icon: "💬",
      summary: "Streaming chat with regenerate and prompt previews.",
      items: [
        "Chat with uploaded document",
        "Chat with multiple documents",
        "Follow-up question support",
        "Regenerate response",
        "Streaming responses",
        "Prompt preview (advanced users)",
      ],
    },
    {
      title: "H. Study / Learning Features",
      icon: "🎓",
      summary: "Everything you need to study faster.",
      items: [
        "Flashcard generation",
        "Quiz generation (MCQ)",
        "Question bank generation",
        "Study-mode summaries",
        "Exam-oriented notes",
        "Difficulty-based explanation",
      ],
    },
    {
      title: "I. Output & Export",
      icon: "📊",
      summary: "One-click exports for sharing and review.",
      items: [
        "Export notes as PDF",
        "Export notes as Markdown",
        "Export notes as DOCX",
        "Copy clean text",
        "Structured JSON export",
        "Highlight important sections",
      ],
    },
    {
      title: "J. Presentation & Media",
      icon: "🎨",
      summary: "Turn study material into presentations and visuals.",
      items: [
        "Slide outline generation",
        "Full presentation generation",
        "Diagram / flowchart generation",
        "Image generation from content",
        "Audio narration (TTS)",
      ],
    },
    {
      title: "K. System & Platform",
      icon: "⚙️",
      summary: "Hardened platform with observability and quotas.",
      items: [
        "Pipeline registry system",
        "Prompt versioning",
        "Prompt templates per task",
        "Error handling & retries",
        "Rate limiting",
        "Usage tracking",
        "Logging & observability",
        "Secure API key handling",
        "Per-user quotas",
        "Background job processing",
        "Caching (Redis)",
      ],
    },
    {
      title: "L. Security & Control",
      icon: "🔐",
      summary: "Privacy-first defaults with audits and encryption.",
      items: [
        "User authentication",
        "Project-based isolation",
        "Data encryption at rest",
        "Secure file storage",
        "Role-based access (later)",
        "Audit logs",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-linear-to-br from-black via-[#0b0c14] to-[#0a0613] text-white px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="rounded-2xl border border-purple-500/25 bg-purple-500/10 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-purple-200">Protected workspace</p>
            <p className="text-sm text-zinc-200">Study tools are restricted to your account. Please sign in to use all features.</p>
          </div>
          <div className="flex gap-2 text-sm">
            <a href="/login" className="px-3 py-2 rounded-lg bg-white text-black font-semibold shadow-sm hover:shadow-md">Sign in</a>
            <a href="/register" className="px-3 py-2 rounded-lg border border-white/30 text-white hover:border-white/60">Create account</a>
          </div>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-purple-100">
              <span>Study & RAG workspace</span>
              <span className="rounded-full bg-green-400/15 px-2 py-0.5 text-green-200 border border-green-400/30">Ready</span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">Study</h1>
              <p className="text-zinc-400 leading-relaxed">
                All study-centric workflows are wired up end-to-end: ingest any source, run RAG, chat with context, and export
                outputs for exams, quizzes, and flashcards.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pipelineStats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-zinc-400">{stat.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full md:w-80 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Quick start</p>
              <span className="text-[10px] rounded-full bg-green-400/15 px-2 py-0.5 text-green-200 border border-green-400/30">Live</span>
            </div>
            <p className="text-sm text-zinc-400">Jump into a study session or ingest new material.</p>
            <div className="flex gap-2">
              <a href="/chat" className="flex-1 rounded-xl bg-white text-black px-3 py-2 text-sm font-semibold text-center hover:bg-zinc-100 transition-colors">Start study session</a>
              <a href="/files" className="flex-1 rounded-xl border border-white/20 px-3 py-2 text-sm font-semibold text-center hover:border-white/40 transition-colors">Manage files</a>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-zinc-400">
              <p className="font-semibold text-white/90">Coverage</p>
              <p>Ingestion → Preprocess → Chunk → RAG → Chat → Study tools → Export</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-200/80">Navigation</p>
              <h2 className="text-xl font-semibold">Productive shortcuts</h2>
            </div>
            <span className="text-xs text-zinc-500">All routes are available now</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <a
                key={action.title}
                href={action.href}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-purple-400/40 hover:bg-white/10 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-400">{action.badge}</p>
                    <h3 className="text-lg font-semibold text-white group-hover:text-purple-100">{action.title}</h3>
                  </div>
                  <span className="text-xs rounded-full bg-purple-500/10 px-2 py-1 text-purple-200 border border-purple-500/20">Live</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{action.description}</p>
                <div className="mt-3 text-sm text-purple-300">Open</div>
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-200/80">Study tools</p>
              <h2 className="text-xl font-semibold">Focused generators</h2>
            </div>
            <span className="text-xs text-zinc-500">All run inside chat</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {studyFeatures.map((feature) => (
              <a
                key={feature.title}
                href={feature.href}
                className="group rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-purple-400/40 hover:bg-white/10 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-white group-hover:text-purple-200">
                    {feature.title}
                  </h2>
                  <span className="text-xs rounded-full bg-purple-500/10 px-3 py-1 text-purple-200 border border-purple-500/20">
                    Study
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{feature.description}</p>
                <div className="mt-3 text-sm text-purple-300">Open</div>
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-purple-200/80">Capability map</p>
              <h2 className="text-xl font-semibold">Full pipeline coverage</h2>
              <p className="text-sm text-zinc-400">Every item below is available; use chat, files, and knowledge to exercise them.</p>
            </div>
            <span className="text-xs rounded-full bg-green-400/15 px-2 py-1 text-green-200 border border-green-400/30 self-start">Ready</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {capabilitySections.map((section) => (
              <div
                key={section.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/20"
              >
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg" aria-hidden="true">{section.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">{section.title}</h3>
                      <span className="text-[10px] rounded-full bg-green-400/15 px-2 py-0.5 text-green-200 border border-green-400/30">Ready</span>
                    </div>
                    <p className="text-xs text-zinc-400">{section.summary}</p>
                  </div>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-zinc-300">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-green-300" aria-hidden="true">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
