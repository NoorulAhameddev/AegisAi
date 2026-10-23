"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Loader2,
  Zap,
  Copy,
  Check,
  Settings,
  FileText,
  StickyNote,
  List,
  Brain,
  BookOpen,
  Lightbulb,
  MessageCircle,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type AICapability =
  | "summarize"
  | "notes"
  | "bullets"
  | "concepts"
  | "definitions"
  | "examples"
  | "explain"
  | "qa";

interface AICapabilityOption {
  id: AICapability;
  label: string;
  icon: LucideIcon;
  description: string;
  complexity: "fast" | "medium" | "slow";
}

const CAPABILITIES: AICapabilityOption[] = [
  {
    id: "summarize",
    label: "Summarize",
    icon: FileText,
    description: "Generate concise summary",
    complexity: "fast",
  },
  {
    id: "notes",
    label: "Notes",
    icon: StickyNote,
    description: "Detailed structured notes",
    complexity: "medium",
  },
  {
    id: "bullets",
    label: "Bullet Points",
    icon: List,
    description: "Key takeaways as bullets",
    complexity: "fast",
  },
  {
    id: "concepts",
    label: "Key Concepts",
    icon: Brain,
    description: "Extract main concepts",
    complexity: "medium",
  },
  {
    id: "definitions",
    label: "Glossary",
    icon: BookOpen,
    description: "Definitions & explanations",
    complexity: "medium",
  },
  {
    id: "examples",
    label: "Examples",
    icon: Lightbulb,
    description: "Real-world examples",
    complexity: "medium",
  },
  {
    id: "explain",
    label: "ELI5",
    icon: MessageCircle,
    description: "Simplified explanation",
    complexity: "fast",
  },
  {
    id: "qa",
    label: "Q&A",
    icon: HelpCircle,
    description: "Answer questions",
    complexity: "medium",
  },
];

interface AICapabilitiesProps {
  onGenerate: (
    capability: AICapability,
    customPrompt?: string,
  ) => Promise<string>;
  loading?: boolean;
  result?: string;
}

export function AICapabilities({
  onGenerate,
  loading = false,
  result,
}: AICapabilitiesProps) {
  const [selectedCapability, setSelectedCapability] =
    useState<AICapability>("summarize");
  const [customPrompt, setCustomPrompt] = useState("");
  const [output, setOutput] = useState(result || "");
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const capability = CAPABILITIES.find((c) => c.id === selectedCapability);

  const handleGenerate = async () => {
    try {
      const response = await onGenerate(selectedCapability, customPrompt);
      setOutput(response);
    } catch (error) {
      setOutput(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Capability Grid */}
      <div className="grid grid-cols-4 gap-2">
        {CAPABILITIES.map((cap) => (
          <button
            key={cap.id}
            onClick={() => setSelectedCapability(cap.id)}
            className={`p-3 border-2 transition text-left ${
              selectedCapability === cap.id
                ? "border-brand bg-ink-800"
                : "border-ink-700 hover:border-ink-500"
            }`}
          >
            <cap.icon className="h-5 w-5 mb-1 text-brand" />
            <p className="text-sm font-medium text-ink-100">{cap.label}</p>
            <p className="text-xs text-ink-500 mt-1">{cap.description}</p>
            <div className="mt-2">
              {cap.complexity === "fast" && (
                <Badge variant="success" className="text-xs">
                  Fast
                </Badge>
              )}
              {cap.complexity === "medium" && (
                <Badge variant="warning" className="text-xs">
                  Medium
                </Badge>
              )}
              {cap.complexity === "slow" && (
                <Badge variant="error" className="text-xs">
                  Slow
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Settings & Custom Prompt */}
      <Card className="p-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-ink-300 hover:text-ink-100"
        >
          <Settings size={16} />
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3 border-t border-hair pt-4">
            <div>
              <label className="text-sm font-medium text-ink-300 block mb-2">
                Custom Prompt (optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Add custom instructions or context..."
                rows={3}
                className="w-full border border-ink-700 bg-ink-900 text-ink-100 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-brand text-ink-950 hover:bg-brand-dim disabled:bg-ink-700 disabled:text-ink-500 font-mono text-[0.7rem] uppercase tracking-[0.12em] py-3 px-4 transition"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Zap size={18} />
            Generate {capability?.label}
          </>
        )}
      </button>

      {/* Output */}
      {output && (
        <Card className="p-4 bg-ink-850 border-hair">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-ink-100">Output</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-ink-800"
            >
              {copied ? (
                <>
                  <Check size={14} />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="bg-ink-900 border border-hair p-4 max-h-72 overflow-y-auto">
            <p className="text-sm text-ink-300 whitespace-pre-wrap">
              {output}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
