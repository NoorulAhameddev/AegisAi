"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, FileText, Loader2, Link as LinkIcon, Download, Search, LayoutGrid, List as ListIcon, Plus, Menu } from "lucide-react";
import Link from "next/link";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

type FileData = {
    id: string;
    name: string;
    path: string;
    type: string;
    createdAt: string;
    size?: number; 
};

export default function FilesPage() {
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [searchQuery, setSearchQuery] = useState("");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    
    const [user, setUser] = useState<{name: string, email: string} | null>(null);

    useEffect(() => {
        Promise.all([
            fetch("/api/files/list").then(res => res.json()),
            fetch("/api/auth/me").then(res => res.json())
        ]).then(([filesData, userData]) => {
            if (Array.isArray(filesData)) setFiles(filesData);
            if (userData?.id) setUser(userData);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this file?")) return;

        setFiles(prev => prev.filter(f => f.id !== id));
        await fetch("/api/files/delete", {
            method: "DELETE",
            body: JSON.stringify({ fileId: id })
        });
    };

    const filteredFiles = files.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading workspace...</div>;
    }

    return (
        <div className="flex h-screen bg-black text-white font-sans overflow-hidden bg-[url('/bg-noise.png')]">
            {user && (
                <>
                    <div className="hidden md:block">
                        <AppSidebar user={user} />
                    </div>
                    <MobileNav user={user} isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
                </>
            )}
            
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                <header className="px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setMobileNavOpen(true)}
                            className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
                            <p className="text-zinc-400 text-sm">Manage documents for your AI context.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group flex-1 md:flex-none">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search files..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all w-full md:w-64"
                                aria-label="Search files"
                            />
                        </div>
                        
                        <div className="hidden sm:flex bg-white/5 rounded-lg p-1 border border-white/10">
                            <button 
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "p-1.5 rounded-md transition-all", 
                                    viewMode === "grid" ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                )}
                                aria-label="Grid view"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={() => setViewMode("list")}
                                className={cn(
                                    "p-1.5 rounded-md transition-all", 
                                    viewMode === "list" ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                )}
                                aria-label="List view"
                            >
                                <ListIcon className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <Link href="/chat" className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-bold text-sm hover:bg-zinc-200 transition-colors whitespace-nowrap">
                            <Plus className="h-4 w-4" /> Upload
                        </Link>
                    </div>
                </header>

                <div className="p-8">
                    {filteredFiles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                            <div className="h-16 w-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                                <FileText className="h-8 w-8 text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-medium mb-1">No files found</h3>
                            <p className="text-zinc-500 text-sm mb-6">Upload documents in a Chat session to see them here.</p>
                            <Link href="/chat" className="px-5 py-2.5 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-all border border-white/5">
                                Go to Chat
                            </Link>
                        </div>
                    ) : (
                        viewMode === "grid" ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {filteredFiles.map((file, i) => {
                                    const delayClass = i === 0 ? "" : 
                                                      i === 1 ? "delay-75" :
                                                      i === 2 ? "delay-100" :
                                                      i === 3 ? "delay-150" :
                                                      i === 4 ? "delay-200" :
                                                      i === 5 ? "delay-300" : "delay-500";
                                    return (
                                    <GlassCard 
                                        key={file.id} 
                                        interactive 
                                        className={cn("group p-5 flex flex-col h-48 animate-slide-up", delayClass)}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform duration-300">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <button 
                                                onClick={(e) => handleDelete(file.id, e)}
                                                className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                                aria-label="Delete file"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="mt-auto">
                                            <h3 className="font-medium text-zinc-200 group-hover:text-blue-200 transition-colors truncate mb-1" title={file.name}>
                                                {file.name}
                                            </h3>
                                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                                                <span className="uppercase font-mono bg-white/5 px-1.5 py-0.5 rounded text-[10px]">{file.type}</span>
                                            </div>
                                        </div>
                                    </GlassCard>
                                )})}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {filteredFiles.map((file, i) => {
                                    const delayClass = i === 0 ? "" : 
                                                      i === 1 ? "delay-75" :
                                                      i === 2 ? "delay-100" :
                                                      i === 3 ? "delay-150" :
                                                      i === 4 ? "delay-200" :
                                                      i === 5 ? "delay-300" : "delay-500";
                                    return (
                                    <div 
                                        key={file.id} 
                                        className={cn(
                                            "group flex items-center justify-between p-4 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all animate-slide-up",
                                            delayClass
                                        )}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-medium text-zinc-200 truncate group-hover:text-white transition-colors">{file.name}</h3>
                                                <p className="text-xs text-zinc-500">{new Date(file.createdAt).toLocaleDateString()} • {file.type.toUpperCase()}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(file.id, e)}
                                            className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                                            aria-label="Delete file"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )})}
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    );
}
