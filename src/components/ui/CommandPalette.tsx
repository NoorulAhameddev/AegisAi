"use client";

import { useState, useEffect, useRef } from "react";
import { Search, MessageSquare, FileText, X, Command as CommandIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
            setQuery("");
            setResults([]);
        }
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(data.results || []);
                setSelectedIndex(0);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: any) => {
        setIsOpen(false);
        if (result.type === "chat") {
            router.push(`/chat?id=${result.id}`);
        } else {
            router.push(`/files`); // Could go to specific file if detailed view exists
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % (results.length || 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
        } else if (e.key === "Enter" && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setIsOpen(false)} />
            
            <div className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up-faint">
                <div className="flex items-center px-4 py-4 border-b border-white/5">
                    <Search className="h-5 w-5 text-zinc-500 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search chats, files, or settings..."
                        className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-zinc-600"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-zinc-500 font-mono">
                        <CommandIcon className="h-3 w-3" />
                        <span>K</span>
                    </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="h-6 w-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-1">
                            {results.map((result, i) => (
                                <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSelect(result)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left",
                                        selectedIndex === i ? "bg-white/10" : "hover:bg-white/5"
                                    )}
                                >
                                    <div className={cn(
                                        "h-10 w-10 rounded-lg flex items-center justify-center",
                                        result.type === 'chat' ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                                    )}>
                                        {result.type === 'chat' ? <MessageSquare className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{result.title}</p>
                                        <p className="text-xs text-zinc-500 flex items-center gap-1 uppercase tracking-wider font-mono">
                                            {result.type} • {result.subtitle}
                                        </p>
                                    </div>
                                    {selectedIndex === i && (
                                        <span className="text-[10px] text-zinc-600 font-mono">Enter to open</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : query.length >= 2 ? (
                        <div className="py-10 text-center text-zinc-500">
                            No results found for "{query}"
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-zinc-500 text-sm">Search across your entire workspace</p>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-600">CHATS</span>
                                <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-600">FILES</span>
                                <span className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-600">SETTINGS</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-white/5 bg-black/20 flex items-center justify-between text-[10px] text-zinc-600">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 uppercase">↑↓</kbd> to navigate</span>
                        <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 uppercase">Enter</kbd> to select</span>
                    </div>
                    <span>ESC to close</span>
                </div>
            </div>
        </div>
    );
}
