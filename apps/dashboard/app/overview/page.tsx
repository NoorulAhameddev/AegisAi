"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type StatusPayload = {
  branch?: string;
  uncommitted?: number;
  mode?: string;
  jobs?: { success: number; failed: number; queued: number };
  lastAudit?: string | null;
};

interface VulnData {
  counts?: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
}

function StatCard({
  label,
  value,
  severity,
  delay = 0,
}: {
  label: string;
  value: number;
  severity: string;
  delay?: number;
}) {
  const colorMap: Record<string, { text: string; bg: string; glow: string }> = {
    critical: {
      text: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
      glow: "glow-danger",
    },
    high: { text: "#f97316", bg: "rgba(249, 115, 22, 0.1)", glow: "" },
    moderate: { text: "#eab308", bg: "rgba(234, 179, 8, 0.1)", glow: "" },
    low: { text: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", glow: "glow-info" },
  };

  const c = colorMap[severity] || {
    text: "#71717a",
    bg: "rgba(113, 113, 122, 0.1)",
    glow: "",
  };

  return (
    <div
      className="rounded-xl border p-5 card-hover opacity-0 animate-fade-in-up"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </span>
        {value > 0 && (
          <div
            className={`w-2 h-2 rounded-full ${c.glow}`}
            style={{ backgroundColor: c.text }}
          />
        )}
      </div>
      <div className="text-3xl font-bold" style={{ color: c.text }}>
        {value}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
  delay = 0,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden opacity-0 animate-fade-in-up"
      style={{
        backgroundColor: "var(--color-bg-secondary)",
        borderColor: "var(--color-border)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: "var(--color-border-muted)" }}
      >
        <div className="flex items-center gap-3">
          <div style={{ color: "var(--color-info)" }}>{icon}</div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function OverviewPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [vulns, setVulns] = useState<VulnData>({
    counts: { critical: 0, high: 0, moderate: 0, low: 0 },
  });
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, vulnsRes] = await Promise.all([
          fetch("/api/status"),
          fetch("/api/vulns"),
        ]);
        const statusData = statusRes.ok ? await statusRes.json() : null;
        const vulnsData = vulnsRes.ok ? await vulnsRes.json() : null;
        setStatus(statusData);
        if (vulnsData?.counts) setVulns(vulnsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await fetch("/api/vulns/scan", { method: "POST" });
      setTimeout(() => setScanning(false), 3000);
    } catch (error) {
      console.error("Scan failed:", error);
      setScanning(false);
    }
  };

  const counts = vulns?.counts || { critical: 0, high: 0, moderate: 0, low: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="opacity-0 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold">ZedBoard</h1>
            <p className="text-sm text-zinc-500">Security Operations Center</p>
          </div>
        </div>
        <p className="text-zinc-400 mt-2">
          Local-first security operations for developers
        </p>
      </div>

      {/* Critical Alert */}
      {counts.critical > 0 && (
        <div
          className="rounded-xl border p-4 flex items-center justify-between opacity-0 animate-fade-in-up"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.05)",
            borderColor: "#ef4444",
            animationDelay: "50ms",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-red-500"
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
            </div>
            <div>
              <p className="font-semibold text-red-400">
                {counts.critical} Critical Vulnerabilit
                {counts.critical === 1 ? "y" : "ies"}
              </p>
              <p className="text-xs text-zinc-500">Immediate action required</p>
            </div>
          </div>
          <Link
            href="/vulnerabilities"
            className="text-sm text-red-400 hover:text-red-300 font-medium"
          >
            Review →
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Critical"
          value={counts.critical}
          severity="critical"
          delay={100}
        />
        <StatCard
          label="High"
          value={counts.high}
          severity="high"
          delay={150}
        />
        <StatCard
          label="Moderate"
          value={counts.moderate}
          severity="moderate"
          delay={200}
        />
        <StatCard label="Low" value={counts.low} severity="low" delay={250} />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-6">
          <InfoCard
            title="Quick Scan"
            delay={300}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
          >
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleScan}
                disabled={scanning}
                className={`
                  px-4 py-2.5 rounded-lg font-medium text-sm
                  flex items-center gap-2
                  transition-all duration-200
                  ${scanning ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"}
                `}
              >
                {scanning ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
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
                )}
                {scanning ? "Scanning..." : "Run Security Scan"}
              </button>
              <Link
                href="/vulnerabilities"
                className="px-4 py-2.5 rounded-lg font-medium text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                View All
              </Link>
            </div>
          </InfoCard>

          <InfoCard
            title="Repository"
            delay={350}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Branch</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-zinc-800 text-zinc-300">
                  {status?.branch || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Uncommitted</span>
                <span
                  className={`font-semibold ${status?.uncommitted ? "text-amber-500" : "text-emerald-500"}`}
                >
                  {status?.uncommitted || 0} files
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-500">Queue Mode</span>
                <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-500/10 text-emerald-500">
                  {status?.mode || "local"}
                </span>
              </div>
            </div>
          </InfoCard>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <InfoCard
            title="Job Statistics"
            delay={400}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            action={
              <Link
                href="/jobs"
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                View →
              </Link>
            }
          >
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">
                  {status?.jobs?.success || 0}
                </div>
                <div className="text-xs text-zinc-500">Success</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${(status?.jobs?.failed || 0) > 0 ? "text-red-500" : "text-zinc-500"}`}
                >
                  {status?.jobs?.failed || 0}
                </div>
                <div className="text-xs text-zinc-500">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {status?.jobs?.queued || 0}
                </div>
                <div className="text-xs text-zinc-500">Queued</div>
              </div>
            </div>
          </InfoCard>

          <InfoCard
            title="Navigation"
            delay={450}
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            }
          >
            <div className="space-y-2">
              {[
                {
                  label: "Vulnerabilities",
                  href: "/vulnerabilities",
                  color: "text-red-400",
                },
                { label: "Tasks", href: "/tasks", color: "text-amber-400" },
                { label: "Jobs", href: "/jobs", color: "text-blue-400" },
                {
                  label: "Activity",
                  href: "/activity",
                  color: "text-purple-400",
                },
                {
                  label: "Security",
                  href: "/security",
                  color: "text-emerald-400",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between p-2.5 rounded-lg transition-colors hover:bg-zinc-800/50 group"
                >
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200">
                    {item.label}
                  </span>
                  <svg
                    className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
