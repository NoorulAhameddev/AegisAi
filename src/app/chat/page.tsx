"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Send, Paperclip, Loader2, StopCircle, Menu, X, MessageSquare, Plus, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

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
  }, [urlChatId]); // Reload list when ID changes (new chat might be created)

  // Load History if ID exists
  useEffect(() => {
    if (urlChatId) {
      setSidebarOpen(false); // Close sidebar on mobile when chat is selected
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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", selectedFile);

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) throw new Error("Upload failed");

      setMessages(prev => [...prev, { role: "SYSTEM", content: `File uploaded: ${selectedFile.name}` }]);
    } catch (err) {
      console.error(err);
      setFile(null); // Reset
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  // Send Message
  const sendMessage = async () => {
    if ((!input.trim() && !file) || generating) return;

    const userMsg = input;
    setInput("");
    setGenerating(true);

    // Optimistic UI
    setMessages((prev) => [...prev, { role: "USER", content: userMsg }]);

    try {
      let activeChatId = urlChatId;
      fetch(`/api/debug-log?msg=${encodeURIComponent("SendMessage start. Input: " + userMsg.substring(0, 20))}`);

      // Create new chat if none exists
      if (!activeChatId) {
        const createRes = await fetch("/api/chat/create", { method: "POST" });
        if (!createRes.ok) throw new Error("Failed to create chat session");
        const createData = await createRes.json();
        activeChatId = createData.chatId;

        // Update URL WITHOUT reload (shallow)
        router.push(`/chat?id=${activeChatId}`);
      }

      fetch(`/api/debug-log?msg=${encodeURIComponent("Calling /api/chat/stream for " + activeChatId)}`);
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId,
          message: userMsg,
        }),
      });

      if (!res.ok) {
        let details = "Server Error";
        try {
          const errorData = await res.json();
          details = errorData.details || errorData.error || details;
        } catch (e) {
          // Fallback for non-JSON errors (like plain text 401s)
          const text = await res.text().catch(() => "");
          details = text || `HTTP ${res.status}: ${res.statusText}`;
        }
        throw new Error(details);
      }

      if (!res.body) throw new Error("Connection failed: No data stream");

      // Stream handling
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      setMessages(prev => [...prev, { role: "ASSISTANT", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantMsg += chunk;

        setMessages(prev => {
          const newMsg = [...prev];
          const last = newMsg[newMsg.length - 1];
          if (last.role === "ASSISTANT") {
            last.content = assistantMsg;
          }
          return newMsg;
        });
      }

    } catch (err: any) {
      console.error("[CHAT_ERROR]", err);

      const specific = err?.message || (typeof err === "string" ? err : "Unknown connection error");
      fetch(`/api/debug-log?msg=${encodeURIComponent("Catch hit: " + specific)}`);
      const errMsg = `Error: ${specific}`;

      setMessages(prev => [...prev, { role: "SYSTEM", content: errMsg }]);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans overflow-hidden">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-white/10 transform transition-transform duration-300 md:relative md:translate-x-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-zinc-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <Link
            href="/chat"
            className="flex items-center gap-2 w-full px-4 py-3 bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
          >
            <Plus className="h-5 w-5" />
            New Chat
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {chatList.map(chat => (
            <Link
              key={chat.id}
              href={`/chat?id=${chat.id}`}
              className={cn(
                "flex flex-col px-4 py-3 rounded-lg text-sm transition-colors",
                urlChatId === chat.id ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              <span className="font-medium truncate">{chat.title || "New Conversation"}</span>
              <span className="text-xs text-zinc-600 mt-1">{new Date(chat.createdAt).toLocaleDateString()}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 text-xs text-center text-zinc-600">
          Aegis AI v1.2
        </div>
      </aside>


      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 rounded-lg text-zinc-400 hover:bg-white/10 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold shadow-lg shadow-purple-500/20">A</div>
            <h1 className="font-semibold text-lg hidden sm:block">Aegis Chat</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-zinc-400 flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              GPT-4o
            </span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
              <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 animate-pulse">
                <MessageSquare className="h-8 w-8 opacity-50" />
              </div>
              <div className="text-center">
                <p className="font-medium text-white mb-1">Welcome to Aegis AI</p>
                <p className="text-sm">Start a conversation or upload a document.</p>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex w-full items-start gap-4 mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300",
                m.role === "USER" ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "h-8 w-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm",
                m.role === "USER" ? "bg-white text-black" : "bg-zinc-800 text-zinc-300",
                m.role === "SYSTEM" && "hidden"
              )}>
                {m.role === "USER" ? "U" : "AI"}
              </div>

              {/* Bubble */}
              <div className={cn(
                "rounded-2xl px-5 py-3 text-sm md:text-base leading-relaxed max-w-[85%] shadow-md",
                m.role === "USER" ? "bg-blue-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-100",
                m.role === "SYSTEM" && "bg-transparent border-none text-zinc-500 italic text-xs w-full text-center shadow-none"
              )}>
                {m.role === "SYSTEM" ? m.content : (
                  <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                    <ReactMarkdown>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black border-t border-white/10">
          <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-zinc-900/50 p-2 rounded-xl border border-white/10 focus-within:border-white/20 ring-1 ring-white/0 focus-within:ring-white/5 transition-all shadow-lg">

            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading || generating}
              accept=".pdf,image/*"
            />

            <button
              disabled={uploading || generating}
              onClick={() => document.getElementById("file-upload")?.click()}
              className={cn(
                "p-3 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors",
                uploading && "animate-pulse"
              )}
              title="Upload File"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={file ? `Info: ${file.name} attached...` : "Send a message..."}
              className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder-zinc-500 resize-none max-h-32 min-h-[44px] py-3 px-2"
              rows={1}
            />

            <button
              onClick={sendMessage}
              disabled={(!input.trim() && !file) || generating}
              className="p-3 bg-white text-black rounded-lg hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {generating ? <StopCircle className="h-5 w-5 animate-pulse" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-center text-xs text-zinc-600 mt-3 hidden sm:block">
            Aegis AI can make mistakes. Verify important information.
          </p>
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
