"use client";
import React, { useEffect, useState } from "react";

interface Vuln {
  package: string;
  severity: string;
  fixAvailable?: boolean;
  isDirect?: boolean;
  details?: any;
}

interface VulnData {
  summary: {
    timestamp: number | null;
    counts: { critical: number; high: number; moderate: number; low: number };
  };
  top: Vuln[];
}

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
  high: { color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
  moderate: { color: "#eab308", bg: "rgba(234, 179, 8, 0.1)" },
  low: { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
};

function StatCard({
  label,
  value,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  color: string;
  delay?: number;
}) {
  const colors: Record<string, { text: string; bg: string; glow: string }> = {
    red: { text: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", glow: "glow-danger" },
    orange: { text: "#f97316", bg: "rgba(249, 115, 22, 0.1)", glow: "" },
    yellow: { text: "#eab308", bg: "rgba(234, 179, 8, 0.1)", glow: "" },
    green: {
      text: "#22c55e",
      bg: "rgba(34, 197, 94, 0.1)",
      glow: "glow-success",
    },
  };

  const c = colors[color] || colors.green;

  return (
    <div
      className="rounded-xl border p-6 card-hover opacity-0 animate-fade-in-up"
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
      <div className="text-4xl font-bold" style={{ color: c.text }}>
        {value}
      </div>
    </div>
  );
}

export default function VulnsPage() {
  const [data, setData] = useState<VulnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "queued">(
    "idle",
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/vulns");
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function runScan() {
    setScanStatus("scanning");
    try {
      const res = await fetch("/api/vulns/scan", { method: "POST" });
      if (res.ok) {
        setScanStatus("queued");
        setTimeout(() => setScanStatus("idle"), 3000);
      }
    } catch (e) {
      setScanStatus("idle");
    }
  }

  async function createTask(pkg: string, severity: string) {
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: `Remediate ${severity.toUpperCase()} - ${pkg}`,
          description: `Investigate and resolve ${severity} severity vulnerability in ${pkg}`,
          priority:
            severity === "critical"
              ? "high"
              : severity === "high"
                ? "high"
                : "medium",
        }),
      });
      alert("Task created");
    } catch (e) {
      alert(`Error: ${e}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin">
          <svg
            className="w-8 h-8"
            style={{ color: "var(--color-info)" }}
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
        </div>
      </div>
    );
  }

  const counts = data?.summary?.counts || {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };
  const vulns = data?.top || [];

  return (
    <div className="space-y-6">
      <div className="opacity-0 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Vulnerabilities</h1>
            <p className="text-zinc-500">
              Monitor and remediate security vulnerabilities
            </p>
          </div>
          <button
            onClick={runScan}
            disabled={scanStatus !== "idle"}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm
              flex items-center gap-2
              transition-all duration-200
              ${
                scanStatus !== "idle"
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
              }
            `}
          >
            {scanStatus === "scanning" && (
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
            )}
            {scanStatus === "scanning"
              ? "Scanning..."
              : scanStatus === "queued"
                ? "Queued"
                : "Run Scan"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Critical"
          value={counts.critical}
          color="red"
          delay={75}
        />
        <StatCard label="High" value={counts.high} color="orange" delay={150} />
        <StatCard
          label="Moderate"
          value={counts.moderate}
          color="yellow"
          delay={225}
        />
        <StatCard label="Low" value={counts.low} color="green" delay={300} />
      </div>

      {/* Vulnerabilities List */}
      <div
        className="rounded-xl border overflow-hidden opacity-0 animate-fade-in-up"
        style={{
          backgroundColor: "var(--color-bg-secondary)",
          borderColor: "var(--color-border)",
          animationDelay: "375ms",
        }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <h2 className="font-semibold">
            All Vulnerabilities ({vulns.length})
          </h2>
        </div>

        {vulns.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-emerald-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-zinc-500">No vulnerabilities found</p>
          </div>
        ) : (
          <div
            className="divide-y"
            style={{ borderColor: "var(--color-border)" }}
          >
            {vulns.map((vuln, i) => {
              const config =
                severityConfig[vuln.severity] || severityConfig.low;
              return (
                <div
                  key={i}
                  className="px-5 py-4 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-1 h-10 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <code className="font-mono text-sm text-zinc-200 truncate">
                            {vuln.package}
                          </code>
                          <span
                            style={{
                              backgroundColor: config.bg,
                              color: config.color,
                            }}
                            className="px-2 py-0.5 rounded text-xs font-medium uppercase flex-shrink-0"
                          >
                            {vuln.severity}
                          </span>
                          {vuln.fixAvailable && (
                            <span className="text-xs text-emerald-500 flex-shrink-0">
                              Fix available
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          {vuln.details}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => createTask(vuln.package, vuln.severity)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex-shrink-0"
                    >
                      Create Task
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
