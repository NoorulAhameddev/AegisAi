"use client";
import React, { useState, useEffect } from "react";

interface Status {
  branch: string;
  uncommitted: number;
  queueMode: string;
  jobs: { success: number; failed: number; queued: number };
  lastAudit: number | null;
}

interface Vuln {
  summary: {
    timestamp: number | null;
    counts: { critical: number; high: number; moderate: number; low: number };
  };
  top: any[];
}

export default function HomePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [vulns, setVulns] = useState<Vuln | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState("idle");

  useEffect(() => {
    async function fetchData() {
      try {
        const [statusRes, vulnsRes] = await Promise.all([
          fetch("/api/status"),
          fetch("/api/vulns"),
        ]);
        if (statusRes.ok) setStatus(await statusRes.json());
        if (vulnsRes.ok) setVulns(await vulnsRes.json());
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
        const data = await res.json();
        setScanStatus(`Job queued: ${data.jobId?.slice(0, 8)}...`);
        setTimeout(() => setScanStatus("idle"), 3000);
      } else {
        setScanStatus("error");
      }
    } catch (e) {
      setScanStatus("error");
    }
  }

  const stats = vulns?.summary.counts || {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Security Dashboard</h1>
        <p className="text-slate-400">Local-first security operations</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Critical" value={stats.critical} color="red" />
        <StatCard label="High" value={stats.high} color="orange" />
        <StatCard label="Moderate" value={stats.moderate} color="yellow" />
        <StatCard label="Low" value={stats.low} color="blue" />
      </div>

      {/* Status & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Git Status */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">
            Git Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300">Branch:</span>
              <span className="font-mono text-blue-400">
                {status?.branch || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Uncommitted:</span>
              <span className="font-mono">{status?.uncommitted || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Queue Mode:</span>
              <span className="font-mono text-green-400">
                {status?.queueMode || "local"}
              </span>
            </div>
          </div>
        </div>

        {/* Job Status */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">
            Job Stats
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300">Succeeded:</span>
              <span className="font-mono text-green-400">
                {status?.jobs.success || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Failed:</span>
              <span className="font-mono text-red-400">
                {status?.jobs.failed || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Queued:</span>
              <span className="font-mono text-yellow-400">
                {status?.jobs.queued || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <button
              onClick={runScan}
              disabled={scanStatus !== "idle"}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-2 rounded font-medium transition text-sm"
            >
              {scanStatus === "idle" ? "Run Vulnerability Scan" : scanStatus}
            </button>
            <a
              href="/security"
              className="block w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-medium transition text-center text-sm"
            >
              Security Check
            </a>
            <a
              href="/tasks"
              className="block w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded font-medium transition text-center text-sm"
            >
              View Tasks
            </a>
          </div>
        </div>
      </div>

      {/* Top Vulnerabilities */}
      {vulns && vulns.top.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
          <h3 className="text-lg font-semibold mb-4">Top Vulnerabilities</h3>
          <div className="space-y-2">
            {vulns.top.slice(0, 5).map((v: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 bg-slate-700 rounded"
              >
                <div>
                  <div className="font-medium">{v.package}</div>
                  <div className="text-xs text-slate-400">
                    {v.details?.module_name || v.details?.summary || ""}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded ${
                    v.severity === "critical"
                      ? "bg-red-900 text-red-200"
                      : v.severity === "high"
                        ? "bg-orange-900 text-orange-200"
                        : v.severity === "moderate"
                          ? "bg-yellow-900 text-yellow-200"
                          : "bg-blue-900 text-blue-200"
                  }`}
                >
                  {v.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClass = {
    red: "bg-red-900/30 border-red-700 text-red-400",
    orange: "bg-orange-900/30 border-orange-700 text-orange-400",
    yellow: "bg-yellow-900/30 border-yellow-700 text-yellow-400",
    blue: "bg-blue-900/30 border-blue-700 text-blue-400",
  }[color];

  return (
    <div className={`border rounded-lg p-4 ${colorClass}`}>
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
// page is a client component exported above
