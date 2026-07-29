"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

interface SecurityIssue {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  status: string;
}

interface SecurityStatus {
  passed: boolean;
  lastCheck: string;
  issues: SecurityIssue[];
}

export default function SecurityPage() {
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSecurity() {
      try {
        const res = await fetch("/api/security");
        if (res.ok) {
          const data = await res.json();
          setSecurity(data || { passed: true, issues: [] });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchSecurity();
  }, []);

  async function createTask(issue: SecurityIssue) {
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: issue.title,
          description: issue.description,
          priority: issue.severity,
        }),
      });
      alert("Task created successfully");
    } catch (e) {
      alert("Failed to create task");
    }
  }

  return (
    <div className="space-y-6">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Security</h1>
        <p className="text-zinc-500">Review security posture and findings</p>
      </div>

      {/* Security Status */}
      <div
        className="rounded-xl border p-6 opacity-0 animate-fade-in-up"
        style={{
          backgroundColor: security?.passed
            ? "rgba(34, 197, 94, 0.05)"
            : "rgba(239, 68, 68, 0.05)",
          borderColor: security?.passed ? "#22c55e" : "#ef4444",
          animationDelay: "75ms",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${security?.passed ? "glow-success" : "glow-danger"}`}
            style={{
              backgroundColor: security?.passed
                ? "rgba(34, 197, 94, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            }}
          >
            {security?.passed ? (
              <svg
                className="w-6 h-6 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
          <div>
            <div
              className="text-xl font-bold"
              style={{ color: security?.passed ? "#22c55e" : "#ef4444" }}
            >
              {security?.passed
                ? "Security Check Passed"
                : "Security Issues Found"}
            </div>
            {security?.lastCheck && (
              <div className="text-sm text-zinc-500">
                Last check: {new Date(security.lastCheck).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Issues */}
      {security && security.issues && security.issues.length > 0 && (
        <div className="space-y-4">
          <h2
            className="text-lg font-semibold opacity-0 animate-fade-in"
            style={{ animationDelay: "150ms" }}
          >
            Issues ({security.issues.length})
          </h2>
          <div className="grid gap-4">
            {security.issues.map((issue, i) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onCreateTask={createTask}
                delay={200 + i * 50}
              />
            ))}
          </div>
        </div>
      )}

      {security && (!security.issues || security.issues.length === 0) && (
        <div
          className="rounded-xl border p-12 text-center opacity-0 animate-fade-in-up"
          style={{
            backgroundColor: "var(--color-bg-secondary)",
            borderColor: "var(--color-border)",
            animationDelay: "150ms",
          }}
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-zinc-300 mb-2">
            No Security Issues
          </p>
          <p className="text-sm text-zinc-500">Your codebase is secure</p>
        </div>
      )}
    </div>
  );
}

function IssueCard({
  issue,
  onCreateTask,
  delay,
}: {
  issue: SecurityIssue;
  onCreateTask: (issue: SecurityIssue) => void;
  delay: number;
}) {
  const severityConfig: Record<string, { color: string; bg: string }> = {
    critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
    high: { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
    medium: { color: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
    low: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
  };

  const config = severityConfig[issue.severity] || severityConfig.low;

  return (
    <div
      className="rounded-xl border p-5 card-hover opacity-0 animate-fade-in-up"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-200 mb-2">{issue.title}</h3>
          <p className="text-sm text-zinc-500">{issue.description}</p>
        </div>
        <span
          style={{ backgroundColor: config.bg, color: config.color }}
          className="px-3 py-1 rounded-lg text-xs font-medium uppercase"
        >
          {issue.severity}
        </span>
      </div>
      <button
        onClick={() => onCreateTask(issue)}
        className="mt-3 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
      >
        Create Task
      </button>
    </div>
  );
}
