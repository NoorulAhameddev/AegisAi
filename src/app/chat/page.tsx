"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, Paperclip, Loader2, StopCircle, Menu, X, MessageSquare, Plus, ArrowLeft, Mic, Copy, Check, FileText, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";



type Message = {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
};

function ChatInterface() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get("id");

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Sidebar State
  const [chatList, setChatList] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Chat List on Mount
  useEffect(() => {
    fetch("/api/chat/list")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setChatList(data);
      })
      .catch(err => console.error(err));
  }, [urlChatId]);

  // Load History if ID exists
  useEffect(() => {
    if (urlChatId) {
      setSidebarOpen(false); // Close sidebar on mobile
      fetch(`/api/chat/history?chatId=${urlChatId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const formatted = data.map((m: any) => ({
              role: m.role.toUpperCase(),
              content: m.content
            }));
            setMessages(formatted);
          }
        })
        .catch(err => console.error("Failed to load history", err));
    } else {
      setMessages([]);
    }
  }, [urlChatId]);

  // Handle File Upload
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      const res = await fetch("/api/files/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadedFileId(data.fileId);
    } catch {
      setFile(null);
      setUploadedFileId(null);
      alert("Failed to upload");
    } finally {
      setUploading(false);
    }
  };

  // Logic
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setGenerating(false);
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !file) || generating) return;
    const userMsg = input;
    setInput("");
    setGenerating(true);
    setMessages((prev) => [...prev, { role: "USER", content: userMsg }]);
    setMessages(prev => [...prev, { role: "ASSISTANT", content: "..." }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      let activeChatId = urlChatId;
      if (!activeChatId) {
        const createRes = await fetch("/api/chat/create", { method: "POST" });
        if (!createRes.ok) throw new Error("Creation failed");
        const createData = await createRes.json();
        activeChatId = createData.chatId;
        router.push(`/chat?id=${activeChatId}`);
      }

      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: activeChatId, message: userMsg, fileId: uploadedFileId }),
        signal: abortController.signal,
      });

      if (!res.ok) throw new Error((await res.json()).error || "Error");
      const { jobId } = await res.json();

      let attempts = 0;
      while (attempts < 120) {
        if (abortController.signal.aborted) break;
        const sRes = await fetch(`/api/chat/status?jobId=${jobId}`);
        const { state, result, error } = await sRes.json();

        if (state === 'completed') {
          setMessages(prev => {
            const n = [...prev];
            if (n[n.length - 1].role === "ASSISTANT") n[n.length - 1].content = result.content;
            return n;
          });
          break;
        }
        if (state === 'failed') throw new Error(error || "Failed");
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }
    } catch (err: any) {
      setMessages(prev => {
        const n = [...prev];
        if (n[n.length - 1].role === "ASSISTANT") n[n.length - 1].content = `Error: ${err.message}`;
        return n;
      });
    } finally {
      setGenerating(false);
      setFile(null);
      setUploadedFileId(null);
    }
  };

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-100 font-sans overflow-hidden bg-[url('/bg-noise.png')]">

      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Glass Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 glass-panel transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col shadow-2xl",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-5 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Home</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-4">
          <Link href="/chat" className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white text-black rounded-xl font-semibold shadow-lg hover:shadow-white/20 hover:-translate-y-0.5 transition-all">
            <Plus className="h-5 w-5" /> New Chat
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1">
          <h3 className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 mt-4">History</h3>
          {chatList.map(chat => (
            <Link key={chat.id} href={`/chat?id=${chat.id}`}
              className={cn(
                "flex flex-col px-4 py-3 rounded-lg text-sm transition-all border border-transparent",
                urlChatId === chat.id
                  ? "bg-zinc-800/50 text-white border-white/5 shadow-inner"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <span className="font-medium truncate">{chat.title || "Untitled Conversation"}</span>
              <span className="text-[10px] text-zinc-600 mt-0.5">{new Date(chat.createdAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-zinc-900/40 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold">U</div>
            <div className="flex-1">
              <p className="text-sm font-medium">Pro User</p>
              <p className="text-xs text-zinc-500">Free Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col w-full min-w-0 bg-transparent relative">
        <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-6 z-10 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm md:backdrop-blur-none">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-zinc-400"><Menu className="h-6 w-6" /></button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
                <span className="text-lg font-bold bg-gradient-to-br from-white to-zinc-400 bg-clip-text text-transparent">A</span>
              </div>
              <span className="font-semibold text-lg tracking-tight">Aegis AI</span>
            </div>
          </div>
          <div className="glass px-3 py-1.5 rounded-full flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-300">System Online</span>
          </div>
        </header>

        {/* Chat Stream */}
        <div className="flex-1 overflow-y-auto pt-20 pb-4 px-4 md:px-0 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 min-h-full pb-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-2xl">
                  <MessageSquare className="h-10 w-10 text-zinc-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">Welcome to Aegis</h2>
                  <p className="text-zinc-500 max-w-sm">Your secure, intelligent assistant empowered with long-term memory.</p>
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn(
                "flex w-full gap-4 md:gap-6 animate-slide-up",
                m.role === "USER" ? "justify-end" : "justify-start"
              )}>
                {m.role !== "USER" && (
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 border border-white/10 flex flex-shrink-0 items-center justify-center shadow-lg">
                    <span className="text-xs font-bold bg-gradient-to-br from-indigo-400 to-cyan-400 bg-clip-text text-transparent">AI</span>
                  </div>
                )}

                <div className={cn(
                  "relative max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-xl text-sm md:text-base leading-7",
                  m.role === "USER"
                    ? "bg-white text-black font-medium"
                    : "glass text-zinc-100 border border-white/10"
                )}>
                  {m.role === "SYSTEM" ? (
                    <span className="italic text-zinc-500 text-xs">{m.content}</span>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-zinc-100 prose-a:text-blue-400">
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <div className="rounded-lg overflow-hidden my-3 border border-white/10 shadow-lg">
                                <div className="bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-500 border-b border-white/5 flex justify-between">
                                  <span>{match[1]}</span>
                                </div>
                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" customStyle={{ margin: 0 }} {...props}>
                                  {String(children).replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              </div>
                            ) : <code className={cn("bg-zinc-800/50 rounded px-1.5 py-0.5 text-xs font-mono", className)} {...props}>{children}</code>
                          }
                        }}
                      >{m.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {m.role === "USER" && (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 flex flex-shrink-0 items-center justify-center shadow-lg text-xs font-bold">U</div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 pb-6 md:pb-8 flex justify-center bg-gradient-to-t from-black via-black/90 to-transparent">
          <div className="w-full max-w-3xl glass p-1.5 rounded-3xl flex items-end gap-2 shadow-2xl relative transition-all focus-within:ring-2 focus-within:ring-white/10 focus-within:bg-zinc-900/40">
            {/* File Upload / Tools */}
            <input type="file" id="f-up" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            <button onClick={() => document.getElementById("f-up")?.click()} className="p-3 rounded-full hover:bg-white/10 text-zinc-400 transition-colors" title="Attach">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 py-3 max-h-40 min-h-[44px] resize-none"
              rows={1}
            />

            {/* Send */}
            <button onClick={generating ? stopGeneration : sendMessage}
              disabled={(!input.trim() && !file) && !generating}
              className={cn(
                "p-3 rounded-full transition-all shadow-lg mb-0.5",
                generating ? "bg-red-500/20 text-red-500 hover:bg-red-500/30" : "bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-600"
              )}
            >
              {generating ? <StopCircle className="h-5 w-5 fill-current" /> : <Send className="h-5 w-5 fill-current" />}
            </button>

            {file && (
              <div className="absolute -top-14 left-4 glass px-3 py-2 rounded-xl flex items-center gap-2 animate-fade-in shadow-xl">
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-zinc-200">{file.name}</span>
                <button onClick={() => setFile(null)}><X className="h-3 w-3 hover:text-white" /></button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center text-zinc-500">Loading chat...</div>}>
      <ChatInterface />
    </Suspense>
  );
}
