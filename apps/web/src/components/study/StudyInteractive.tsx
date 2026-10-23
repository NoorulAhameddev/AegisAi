"use client";

import React, { useState } from "react";
import { FlashcardGenerator } from "@/components/features/AICapabilities";
import { QuizGenerator } from "@/components/features/Study";
import {
  parseFlashcards,
  parseQuiz,
  Flashcard,
  QuizQuestion,
} from "@/lib/study/parsers";
import ReactMarkdown from "react-markdown";
import ExportButton from "@/components/ExportButton";

export default function StudyInteractive() {
  const [text, setText] = useState("");
  const [eli5, setEli5] = useState<string>("");
  const [eli5NoteId, setEli5NoteId] = useState<string | null>(null);
  const [examNotes, setExamNotes] = useState<string>("");
  const [examNoteId, setExamNoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [flashcardsNoteId, setFlashcardsNoteId] = useState<string | null>(null);
  const [quizNoteId, setQuizNoteId] = useState<string | null>(null);
  const [questionBank, setQuestionBank] = useState<string>("");
  const [questionBankNoteId, setQuestionBankNoteId] = useState<string | null>(
    null,
  );

  const callOperate = async (
    operation: string,
    extra?: Record<string, any>,
  ) => {
    const body = { operation, text, ...(extra || {}) };
    const res = await fetch("/api/ai/operate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || "Request failed");
    }
    return res.json();
  };

  const onGenerateFlashcards = async (): Promise<Flashcard[]> => {
    setLoading(true);
    try {
      const result = await callOperate("flashcards");
      const content: string = result.content || "";
      setFlashcardsNoteId(result.noteId || null);
      return parseFlashcards(content);
    } finally {
      setLoading(false);
    }
  };

  const onGenerateQuiz = async (): Promise<QuizQuestion[]> => {
    setLoading(true);
    try {
      const result = await callOperate("quiz");
      const content: string = result.content || "";
      setQuizNoteId(result.noteId || null);
      return parseQuiz(content);
    } finally {
      setLoading(false);
    }
  };

  const generateEli5 = async () => {
    setLoading(true);
    try {
      const result = await callOperate("eli5");
      setEli5(result.content || "");
      setEli5NoteId(result.noteId || null);
    } finally {
      setLoading(false);
    }
  };

  const generateExamNotes = async () => {
    setLoading(true);
    try {
      const result = await callOperate("exam-notes");
      setExamNotes(result.content || "");
      setExamNoteId(result.noteId || null);
    } finally {
      setLoading(false);
    }
  };

  const generateQuestionBank = async () => {
    setLoading(true);
    try {
      const result = await callOperate("questions");
      setQuestionBank(result.content || "");
      setQuestionBankNoteId(result.noteId || null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input area */}
      <div className="border border-hair bg-ink-900 p-4">
        <label className="text-sm text-ink-300">Paste study content</label>
        <textarea
          className="mt-2 w-full h-40 bg-ink-950 border border-hair text-ink-100 p-3 focus:border-brand focus:outline-none"
          placeholder="Paste text from files, transcripts, or notes..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="mt-2 text-xs text-ink-500">
          This content is processed client-side and sent to the protected API to
          generate study outputs.
        </p>
      </div>

      {/* Generators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm text-ink-500 uppercase tracking-wider font-mono">Flashcards</p>
          <FlashcardGenerator
            onGenerate={onGenerateFlashcards}
            loading={loading}
          />
          {flashcardsNoteId && (
            <div className="mt-2">
              <ExportButton type="note" itemId={flashcardsNoteId} />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-ink-500 uppercase tracking-wider font-mono">Quiz (MCQ)</p>
          <QuizGenerator onGenerate={onGenerateQuiz} loading={loading} />
          {quizNoteId && (
            <div className="mt-2">
              <ExportButton type="note" itemId={quizNoteId} />
            </div>
          )}

          <div className="border border-hair bg-ink-900 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-ink-100">Question Bank</p>
              <button
                onClick={generateQuestionBank}
                disabled={loading || !text}
                className="text-xs px-3 py-1 bg-brand text-ink-950 font-medium hover:bg-brand-dim disabled:opacity-50"
              >
                Generate
              </button>
            </div>
            {questionBank ? (
              <div className="prose prose-invert max-w-none text-sm">
                <ReactMarkdown>{questionBank}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs text-ink-500">
                Generate a mix of recall, conceptual, and application questions.
              </p>
            )}
            {questionBankNoteId && (
              <div className="mt-3">
                <ExportButton type="note" itemId={questionBankNoteId} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ELI5 & Exam Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-hair bg-ink-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink-100">ELI5 Explanation</p>
            <button
              onClick={generateEli5}
              disabled={loading || !text}
              className="text-xs px-3 py-1 bg-brand text-ink-950 font-medium hover:bg-brand-dim disabled:opacity-50"
            >
              Generate
            </button>
          </div>
          {eli5 ? (
            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown>{eli5}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-ink-500">
              Get a simple explanation suitable for beginners.
            </p>
          )}
          {eli5NoteId && (
            <div className="mt-3">
              <ExportButton type="note" itemId={eli5NoteId} />
            </div>
          )}
        </div>

        <div className="border border-hair bg-ink-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink-100">
              Exam-Oriented Notes
            </p>
            <button
              onClick={generateExamNotes}
              disabled={loading || !text}
              className="text-xs px-3 py-1 bg-brand text-ink-950 font-medium hover:bg-brand-dim disabled:opacity-50"
            >
              Generate
            </button>
          </div>
          {examNotes ? (
            <div className="prose prose-invert max-w-none text-sm">
              <ReactMarkdown>{examNotes}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              Produce condensed notes focused on exam preparation.
            </p>
          )}
          {examNoteId && (
            <div className="mt-3">
              <ExportButton type="note" itemId={examNoteId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
