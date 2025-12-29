"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, FileText, Loader2, Link as LinkIcon, Download } from "lucide-react";
import Link from "next/link";

type FileData = {
    id: string;
    name: string;
    path: string;
    type: string;
    createdAt: string;
};

export default function FilesPage() {
    const [files, setFiles] = useState<FileData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/files/list")
            .then(res => res.json())
            .then(setFiles)
            .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this file?")) return;

        setFiles(prev => prev.filter(f => f.id !== id)); // Optimistic update
        await fetch("/api/files/delete", {
            method: "DELETE",
            body: JSON.stringify({ fileId: id })
        });
    };

    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/dashboard" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Knowledge Base</h1>
                        <p className="text-zinc-400 text-sm">Manage files used by your AI assistant.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                            <FileText className="h-6 w-6 text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">No files uploaded</h3>
                        <p className="text-zinc-500 text-sm">Upload documents in a Chat session to see them here.</p>
                        <Link href="/chat" className="inline-block mt-4 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-zinc-200">
                            Go to Chat
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {files.map(file => (
                            <div key={file.id} className="group flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-zinc-200 group-hover:text-white transition-colors">{file.name}</p>
                                        <p className="text-xs text-zinc-500 font-mono">
                                            {new Date(file.createdAt).toLocaleDateString()} • {file.type.toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDelete(file.id)}
                                        className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                        title="Delete File"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
