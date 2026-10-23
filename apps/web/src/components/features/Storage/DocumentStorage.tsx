"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Save, Clock, Tag, Archive, Trash2, Copy } from "lucide-react";

interface StoredDocument {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  version: number;
  archived: boolean;
}

interface DocumentStorageProps {
  onSave: (title: string, content: string, tags: string[]) => Promise<string>;
  onDelete: (documentId: string) => Promise<void>;
  documents: StoredDocument[];
  currentContent?: string;
}

export function DocumentStorage({
  onSave,
  onDelete,
  documents,
  currentContent = "",
}: DocumentStorageProps) {
  const [saveTitle, setSaveTitle] = useState("");
  const [saveTags, setSaveTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<StoredDocument | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSave = async () => {
    if (!saveTitle.trim()) {
      console.warn("Document save attempted without title");
      return;
    }

    try {
      setSaving(true);
      const tags = saveTags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      await onSave(saveTitle, currentContent, tags);
      setSaveTitle("");
      setSaveTags("");
      setShowSaveDialog(false);
    } catch (error) {
      console.error(
        "Document save failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (docId: string) => {
    // TODO: Replace with a confirmation modal
    try {
      await onDelete(docId);
    } catch (error) {
      console.error(
        "Document delete failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  const nonArchivedDocs = documents.filter((d) => !d.archived);
  const archivedDocs = documents.filter((d) => d.archived);

  return (
    <div className="space-y-4">
      {/* Save Button */}
      <button
        onClick={() => setShowSaveDialog(!showSaveDialog)}
        className="w-full flex items-center justify-center gap-2 bg-brand text-ink-950 hover:bg-brand-dim font-mono text-[0.7rem] uppercase tracking-[0.12em] py-2 px-4 transition"
      >
        <Save size={18} />
        Save Document
      </button>

      {/* Save Dialog */}
      {showSaveDialog && (
        <Card className="p-4 bg-ink-850 border-hair">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-ink-300 mb-1">
                Document Title
              </label>
              <Input
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="My Notes, Summary, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-300 mb-1">
                Tags (comma-separated)
              </label>
              <Input
                type="text"
                value={saveTags}
                onChange={(e) => setSaveTags(e.target.value)}
                placeholder="important, todo, reference"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2 border border-hair font-medium text-ink-100 hover:bg-ink-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !saveTitle.trim()}
                className="flex-1 bg-brand text-ink-950 hover:bg-brand-dim disabled:bg-ink-700 font-medium py-2 transition"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Saved Documents */}
      {nonArchivedDocs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-display text-lg font-medium tracking-tight text-ink-100 mb-3">
            Saved Documents ({nonArchivedDocs.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {nonArchivedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-3 bg-ink-900 border border-hair hover:bg-ink-800 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-ink-100">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-ink-500 mt-1">
                      <Clock size={12} />
                      {new Date(doc.updatedAt).toLocaleDateString()}
                      <Badge variant="secondary" className="text-xs">
                        v{doc.version}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="p-1 text-ink-500 hover:text-brand"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-1 text-ink-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {doc.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {doc.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Archived Documents */}
      {archivedDocs.length > 0 && (
        <Card className="p-4">
          <h3 className="font-medium mb-3 flex items-center gap-2 text-ink-100">
            <Archive size={16} />
            Archived ({archivedDocs.length})
          </h3>
          <div className="space-y-2 max-h-32 overflow-y-auto opacity-60">
            {archivedDocs.map((doc) => (
              <div
                key={doc.id}
                className="p-2 bg-ink-900 border border-hair text-sm"
              >
                <p className="font-medium text-ink-400">{doc.title}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
