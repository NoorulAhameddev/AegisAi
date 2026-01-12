"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, Menu, MessageSquare, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { MobileNav } from "@/components/layout/MobileNav";
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

interface ChatClientProps {
  user: any;
}

export default function ChatClient({ user }: ChatClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlChatId = searchParams.get("id");

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true); 
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [chatList, setChatList] = useState<ChatSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetch("/api/chat/list")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setChatList(data);
      })
      .catch(err => console.error(err));
  }, [urlChatId, generating]); 

  useEffect(() => {
    if (urlChatId) {
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
        const createRes = await fetch("/api/chat/create", { method: "POST", body: "{}" });
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
      const maxAttempts = 120; // 2 minutes with 1s polling
      while (attempts < maxAttempts) {
        if (abortController.signal.aborted) break;
        
        try {
          const sRes = await fetch(`/api/chat/status?jobId=${jobId}`);
          
          // ✅ CRITICAL FIX: Validate HTTP response before parsing
          if (!sRes.ok) {
            const errorData = await sRes.json().catch(() => ({}));
            console.error(`[Chat] Status endpoint returned ${sRes.status}:`, errorData);
            
            if (sRes.status === 429) {
              throw new Error("Rate limited. Please wait before trying again.");
            } else if (sRes.status >= 500) {
              throw new Error("Server error. Please try again shortly.");
            } else {
              throw new Error(errorData.error || `HTTP ${sRes.status}`);
            }
          }
          
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
        } catch (pollErr: any) {
          console.error(`[Chat] Polling error on attempt ${attempts}:`, pollErr.message);
          
          // If it's a rate limit error, show it and stop polling
          if (pollErr.message.includes('Rate limited') || pollErr.message.includes('429')) {
            throw new Error(pollErr.message);
          }
          
          // For transient errors, continue polling
          if (attempts < maxAttempts - 1) {
            await new Promise(r => setTimeout(r, 1000));
            attempts++;
          } else {
            throw pollErr;
          }
        }
      }
      
      // If we exhausted all attempts, that's a timeout
      if (attempts >= maxAttempts) {
        throw new Error("Request timeout. The AI response took too long.");
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages(prev => {
          const n = [...prev];
          if (n[n.length - 1].role === "ASSISTANT") n[n.length - 1].content = `Error: ${err.message}`;
          return n;
        });
      }
    } finally {
      setGenerating(false);
      setFile(null);
      setUploadedFileId(null);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white selection:bg-purple-500/30 font-sans overflow-hidden">
      <div className="hidden md:block h-full shrink-0 z-40">
         <AppSidebar user={user} />
      </div>

      <MobileNav user={user} isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
        <header className="flex items-center justify-between px-6 h-16 border-b border-white/5 bg-black/20 backdrop-blur-sm z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
                <button 
                  onClick={() => setMobileNavOpen(true)}
                  className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors" 
                  aria-label="Open Menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
            </div>
            
            <button 
              onClick={() => setHistoryOpen(!historyOpen)}
              className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                historyOpen ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
              title={historyOpen ? "Close Sidebar" : "Open Sidebar"}
              aria-label={historyOpen ? "Close History" : "Open History"}
            >
              {historyOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            
            {!historyOpen && (
               <span className="text-sm font-medium text-zinc-400 animate-fade-in">
                  {chatList.find(c => c.id === urlChatId)?.title || "New Chat"}
               </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
             <Link href="/chat" className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/5" title="New Chat" aria-label="Start New Chat">
                <Plus className="h-5 w-5" />
             </Link>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
            <div className={cn(
                "hidden md:flex flex-col bg-zinc-900/30 border-r border-white/5 transition-all duration-300 ease-in-out overflow-hidden h-full",
                historyOpen ? "w-80 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-4 border-r-0"
            )}>
                <div className="p-4 h-full overflow-y-auto w-80 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recent Chats</h3>
                    </div>
                    
                    <div className="space-y-1">
                        {chatList.map(chat => (
                        <Link 
                            key={chat.id} 
                            href={`/chat?id=${chat.id}`}
                            className={cn(
                            "flex flex-col px-3 py-3.5 rounded-xl text-sm truncate transition-all border border-transparent group",
                            urlChatId === chat.id 
                                ? "bg-white/10 text-white border-white/5 shadow-sm" 
                                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                            )}
                        >
                            <span className="font-medium truncate">{chat.title || "Untitled Conversation"}</span>
                            <span className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1 group-hover:text-zinc-500">
                                {new Date(chat.createdAt).toLocaleDateString()}
                            </span>
                        </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative min-w-0 bg-[url('/bg-noise.png')] bg-repeat opacity-100">
                <div className="flex-1 overflow-y-auto pt-6 px-4 md:px-0 scrollbar-hide">
                    <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end pb-8">
                        {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in pb-20">
                            <div className="relative group cursor-default">
                                <div className="absolute inset-0 bg-purple-500 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-1000 rounded-full" />
                                <div className="relative h-20 w-20 rounded-2xl bg-linear-to-br from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                <MessageSquare className="h-8 w-8 text-white" />
                                </div>
                            </div>
                            <div>
                                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-b from-white to-zinc-500 mb-3">
                                    How can I help you?
                                </h2>
                                <p className="text-zinc-500 max-w-md mx-auto leading-relaxed">
                                    I'm Aegis, your AI assistant. I can help you analyze documents, write code, or just chat.
                                </p>
                            </div>
                        </div>
                        ) : (
                            <div className="space-y-8 pb-4 pt-10">
                                {messages.map((m, i) => (
                                    <MessageBubble key={i} role={m.role} content={m.content} />
                                ))}
                                <div ref={messagesEndRef} className="h-4" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 md:p-6 z-20">
                     <div className="max-w-3xl mx-auto">
                        <ChatInput 
                            input={input}
                            setInput={setInput}
                            onSubmit={sendMessage}
                            isLoading={generating}
                            onStop={stopGeneration}
                            file={file}
                            setFile={setFile}
                            isUploading={uploading}
                            onUpload={handleFileUpload}
                        />
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
