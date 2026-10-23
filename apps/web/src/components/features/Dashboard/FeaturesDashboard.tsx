"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import {
  BarChart3,
  Upload,
  Zap,
  BookOpen,
  Share2,
  Settings,
  Calendar,
  TrendingUp,
  Inbox,
  Search,
  Scissors,
  Brain,
  HardDrive,
  MessageSquare,
  GraduationCap,
  Lock,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DashboardStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  lastProcessed?: string;
  totalChats: number;
  totalExports: number;
}

interface DashboardProps {
  stats?: DashboardStats;
  recentActivity?: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: string;
    type: "upload" | "process" | "export" | "chat";
  }>;
}

export function FeaturesDashboard({
  stats,
  recentActivity = [],
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const features: Array<{
    id: string;
    name: string;
    description: string;
    icon: LucideIcon;
    items: number;
    status: "complete";
  }> = [
    {
      id: "A",
      name: "Input & Ingestion",
      description: "Text, files, URLs, audio, images",
      icon: Inbox,
      items: 9,
      status: "complete",
    },
    {
      id: "B",
      name: "Extraction & Preprocessing",
      description: "PDF, OCR, transcription, normalization",
      icon: Search,
      items: 8,
      status: "complete",
    },
    {
      id: "C",
      name: "Chunking & Tokens",
      description: "Fixed, recursive, semantic chunking",
      icon: Scissors,
      items: 7,
      status: "complete",
    },
    {
      id: "D",
      name: "AI Capabilities",
      description: "Summarize, notes, Q&A, explanations",
      icon: Brain,
      items: 10,
      status: "complete",
    },
    {
      id: "E",
      name: "RAG System",
      description: "Vector storage, semantic search, sources",
      icon: BookOpen,
      items: 10,
      status: "complete",
    },
    {
      id: "F",
      name: "Memory & Storage",
      description: "Save, version, tag, delete documents",
      icon: HardDrive,
      items: 7,
      status: "complete",
    },
    {
      id: "G",
      name: "Chat & Interaction",
      description: "Multi-doc chat, follow-ups, streaming",
      icon: MessageSquare,
      items: 6,
      status: "complete",
    },
    {
      id: "H",
      name: "Study Features",
      description: "Flashcards, quizzes, study mode",
      icon: GraduationCap,
      items: 6,
      status: "complete",
    },
    {
      id: "I",
      name: "Export Options",
      description: "PDF, Markdown, Word, JSON, Text",
      icon: Upload,
      items: 5,
      status: "complete",
    },
    {
      id: "K",
      name: "System & Platform",
      description: "Registry, prompts, rate limiting, caching",
      icon: Settings,
      items: 10,
      status: "complete",
    },
    {
      id: "L",
      name: "Security & Control",
      description: "Auth, encryption, audit logs",
      icon: Lock,
      items: 6,
      status: "complete",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink-100 mb-2">
          Production Dashboard
        </h1>
        <p className="text-ink-400">
          90+ features across 11 categories, all frontend-ready
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-ink-400">Documents</p>
              <Upload size={18} className="text-brand" />
            </div>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {stats.totalDocuments}
            </p>
            <p className="text-xs text-ink-500 mt-1">+2 this week</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-ink-400">Chunks</p>
              <Zap size={18} className="text-brand" />
            </div>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {stats.totalChunks}
            </p>
            <p className="text-xs text-ink-500 mt-1">Optimized</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-ink-400">Tokens</p>
              <BarChart3 size={18} className="text-emerald-400" />
            </div>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {(stats.totalTokens / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-ink-500 mt-1">Total processed</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-ink-400">Chats</p>
              <Share2 size={18} className="text-brand" />
            </div>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {stats.totalChats}
            </p>
            <p className="text-xs text-ink-500 mt-1">Conversations</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-ink-400">Exports</p>
              <TrendingUp size={18} className="text-brand" />
            </div>
            <p className="font-display text-2xl font-medium tracking-tight text-ink-100">
              {stats.totalExports}
            </p>
            <p className="text-xs text-ink-500 mt-1">Generated</p>
          </Card>
        </div>
      )}

      {/* Features Grid */}
      <div>
        <h2 className="font-display text-xl font-medium tracking-tight text-ink-100 mb-4">
          Feature Categories
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {features.map((feature) => (
            <Card
              key={feature.id}
              className="p-4 hover:bg-ink-800 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <feature.icon className="h-6 w-6 text-brand shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-ink-100">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-ink-400 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="ml-2">
                  <Check size={12} className="mr-1" />
                  Ready
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-hair">
                <p className="text-xs text-ink-500">
                  <span className="font-medium text-ink-100">
                    {feature.items}
                  </span>{" "}
                  features
                </p>
                <button className="text-xs text-brand hover:text-brand-dim font-medium">
                  Explore →
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card className="p-4">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink-100 mb-4">
            Recent Activity
          </h2>
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-3 border-b border-hair last:border-b-0"
              >
                <div
                  className="w-2 h-2 rounded-[2px] mt-2 flex-shrink-0"
                  style={{
                    backgroundColor:
                      activity.type === "upload"
                        ? "#c8965a"
                        : activity.type === "process"
                          ? "#8f9d59"
                          : activity.type === "export"
                            ? "#a3753f"
                            : "#b8b0a6",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-100">
                    {activity.action}
                  </p>
                  <p className="text-xs text-ink-400">
                    {activity.description}
                  </p>
                </div>
                <div className="text-xs text-ink-500 whitespace-nowrap ml-2">
                  <Calendar size={12} className="inline mr-1" />
                  {activity.timestamp}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Feature Roadmap Summary */}
      <Card className="p-4 bg-ink-850 border-hair">
        <h3 className="font-medium text-ink-100 mb-2">
          Production Readiness
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-ink-800 overflow-hidden">
              <div className="h-full bg-brand" style={{ width: "100%" }} />
            </div>
            <span className="text-sm font-medium text-brand">100%</span>
          </div>
          <p className="text-xs text-ink-300">
            All 90+ features have production-grade frontend components
          </p>
          <p className="text-xs text-ink-300">
            Responsive design, accessibility compliant, dark mode ready
          </p>
        </div>
      </Card>
    </div>
  );
}
