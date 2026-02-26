/**
 * Notes Viewer Component
 * Display and manage AI-generated notes
 */

"use client";

import { useState, useEffect } from "react";
import {
  FileTextIcon,
  TagIcon,
  CalendarIcon,
  TrashIcon,
  EditIcon,
} from "lucide-react";
import ExportButton from "./ExportButton";

interface Note {
  id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  createdAt: string;
  version: number;
  project?: {
    id: string;
    name: string;
  };
}

interface NotesViewerProps {
  projectId?: string;
  type?: string;
  onRefresh?: () => void;
}

export default function NotesViewer({
  projectId,
  type,
  onRefresh,
}: NotesViewerProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  useEffect(() => {
    fetchNotes();
  }, [projectId, type]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (type) params.append("type", type);

      const response = await fetch(`/api/notes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;

    try {
      const response = await fetch(`/api/notes?id=${noteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes(notes.filter((n) => n.id !== noteId));
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
        }
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("Failed to delete note");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">Loading notes...</div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileTextIcon size={48} className="mx-auto mb-4 opacity-50" />
        <p>No notes yet. Generate notes using AI operations.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
      {/* Notes List */}
      <div className="lg:col-span-1 space-y-2 overflow-y-auto max-h-[600px] border border-gray-300 dark:border-gray-700 rounded-lg p-3">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => setSelectedNote(note)}
            className={`w-full text-left p-3 rounded-lg transition ${
              selectedNote?.id === note.id
                ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500"
                : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent"
            }`}
          >
            <div className="font-medium truncate mb-1">{note.title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div className="flex items-center gap-1">
                <FileTextIcon size={12} />
                {note.type.replace(/_/g, " ")}
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon size={12} />
                {formatDate(note.createdAt)}
              </div>
            </div>
            {note.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {note.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Note Detail */}
      <div className="lg:col-span-2">
        {selectedNote ? (
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 h-full overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">
                  {selectedNote.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <FileTextIcon size={14} />
                    {selectedNote.type.replace(/_/g, " ")}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon size={14} />
                    {formatDate(selectedNote.createdAt)}
                  </span>
                  <span>v{selectedNote.version}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <ExportButton
                  type="note"
                  itemId={selectedNote.id}
                  itemTitle={selectedNote.title}
                />
                <button
                  onClick={() => deleteNote(selectedNote.id)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  title="Delete"
                >
                  <TrashIcon size={18} />
                </button>
              </div>
            </div>

            {selectedNote.project && (
              <div className="mb-4 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg inline-block">
                <span className="text-sm">
                  Project: {selectedNote.project.name}
                </span>
              </div>
            )}

            {selectedNote.tags.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedNote.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{selectedNote.content}</div>
            </div>
          </div>
        ) : (
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 h-full flex items-center justify-center text-gray-500">
            Select a note to view details
          </div>
        )}
      </div>
    </div>
  );
}
