/**
 * AI Operations Panel
 * UI for all AI transformation operations
 */

"use client";

import { useState } from "react";
import {
  Wand2Icon,
  ListIcon,
  FileTextIcon,
  BookOpenIcon,
  LightbulbIcon,
  SparklesIcon,
  SmileIcon,
  LayoutListIcon,
} from "lucide-react";

interface AIOperationsPanelProps {
  selectedText: string;
  projectId?: string;
  onOperationComplete?: (result: any) => void;
}

const operations = [
  {
    id: "summary-short",
    label: "Short Summary",
    icon: ListIcon,
    description: "5 bullet points",
  },
  {
    id: "summary-detailed",
    label: "Detailed Summary",
    icon: FileTextIcon,
    description: "Comprehensive overview",
  },
  {
    id: "structured-notes",
    label: "Structured Notes",
    icon: BookOpenIcon,
    description: "Organized by sections",
  },
  {
    id: "bullet-points",
    label: "Bullet Points",
    icon: LayoutListIcon,
    description: "Key points list",
  },
  {
    id: "key-concepts",
    label: "Key Concepts",
    icon: LightbulbIcon,
    description: "Main ideas",
  },
  {
    id: "glossary",
    label: "Glossary",
    icon: BookOpenIcon,
    description: "Term definitions",
  },
  {
    id: "examples",
    label: "Examples",
    icon: SparklesIcon,
    description: "Practical examples",
  },
  {
    id: "eli5",
    label: "Simple Explanation",
    icon: SmileIcon,
    description: "Easy to understand",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    icon: FileTextIcon,
    description: "Q&A format",
  },
  {
    id: "quiz",
    label: "Quiz",
    icon: FileTextIcon,
    description: "Multiple choice",
  },
  {
    id: "questions",
    label: "Question Bank",
    icon: FileTextIcon,
    description: "Study questions",
  },
  {
    id: "exam-notes",
    label: "Exam Notes",
    icon: BookOpenIcon,
    description: "Exam-focused",
  },
];

export default function AIOperationsPanel({
  selectedText,
  projectId,
  onOperationComplete,
}: AIOperationsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [currentOperation, setCurrentOperation] = useState<string | null>(null);

  const executeOperation = async (operationId: string) => {
    if (!selectedText.trim()) {
      alert("Please select or enter text first");
      return;
    }

    setLoading(true);
    setCurrentOperation(operationId);
    setResult(null);

    try {
      const response = await fetch("/api/ai/operate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operation: operationId,
          text: selectedText,
          projectId,
        }),
      });

      if (!response.ok) {
        throw new Error("Operation failed");
      }

      const data = await response.json();
      setResult(data.content);

      if (onOperationComplete) {
        onOperationComplete(data);
      }
    } catch (error) {
      console.error("Operation error:", error);
      alert("Operation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Wand2Icon size={20} />
        AI Operations
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {operations.map((op) => {
          const Icon = op.icon;
          return (
            <button
              key={op.id}
              onClick={() => executeOperation(op.id)}
              disabled={loading || !selectedText.trim()}
              className="flex flex-col items-start gap-2 p-4 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon size={20} className="text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <div className="font-medium">{op.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {op.description}
                </div>
              </div>
              {loading && currentOperation === op.id && (
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Processing...
                </div>
              )}
            </button>
          );
        })}
      </div>

      {result && (
        <div className="mt-6 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
          <h4 className="font-semibold mb-2">Result:</h4>
          <div className="whitespace-pre-wrap text-sm">{result}</div>
        </div>
      )}
    </div>
  );
}
