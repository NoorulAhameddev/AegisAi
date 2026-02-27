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

export default function VulnsPage() {
  const [data, setData] = useState<VulnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanStatus, setScanStatus] = useState("idle");
  const [filter, setFilter] = useState("all");

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
        setScanStatus("scan_queued");
        setTimeout(() => setScanStatus("idle"), 3000);
      }
    } catch (e) {
      setScanStatus("error");
    }
  }

  async function createTask(pkg: string, severity: string) {
    const body = {
      title: `Remediate ${severity.toUpperCase()} in ${pkg}`,
      description: `Investigate and upgrade ${pkg} to fix ${severity} vulnerability`,
      priority:
        severity === "critical"
          ? "High"
          : severity === "high"
            ? "High"
            : "Medium",
    };
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      alert("Task created successfully");
    } else {
      alert("Failed to create task");
    }
  }

  const stats = data?.summary.counts || {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  };
  const filteredVulns =
    data?.top.filter((v) => {
      if (filter === "all") return true;
      return v.severity === filter;
    }) || [];

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Vulnerabilities</h1>
          <p className="text-slate-400">
            {data?.summary.timestamp
              ? new Date(data.summary.timestamp).toLocaleString()
              : "Never scanned"}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanStatus !== "idle"}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded font-medium transition"
        >
          {scanStatus === "idle"
            ? "Run Scan"
            : scanStatus === "scanning"
              ? "Scanning..."
              : "Queued"}
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
          <div className="text-sm text-red-300">Critical</div>
          <div className="text-2xl font-bold text-red-400">
            {stats.critical}
          </div>
        </div>
        <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-4">
          <div className="text-sm text-orange-300">High</div>
          <div className="text-2xl font-bold text-orange-400">{stats.high}</div>
        </div>
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
          <div className="text-sm text-yellow-300">Moderate</div>
          <div className="text-2xl font-bold text-yellow-400">
            {stats.moderate}
          </div>
        </div>
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
          <div className="text-sm text-blue-300">Low</div>
          <div className="text-2xl font-bold text-blue-400">{stats.low}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        {["all", "critical", "high", "moderate", "low"].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilter(sev)}
            className={`px-4 py-2 rounded font-medium transition ${
              filter === sev
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            {sev.charAt(0).toUpperCase() + sev.slice(1)}
          </button>
        ))}
      </div>

      {/* Vulnerabilities List */}
      {loading ? (
        <div className="text-slate-400">Loading...</div>
      ) : filteredVulns.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
          <p>No vulnerabilities found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVulns.map((v, i) => {
            const severityClass =
              {
                critical: "bg-red-900/20 border-red-700 text-red-300",
                high: "bg-orange-900/20 border-orange-700 text-orange-300",
                moderate: "bg-yellow-900/20 border-yellow-700 text-yellow-300",
                low: "bg-blue-900/20 border-blue-700 text-blue-300",
              }[v.severity] || "bg-slate-700";

            const badgeClass = {
              critical: "bg-red-900 text-red-200",
              high: "bg-orange-900 text-orange-200",
              moderate: "bg-yellow-900 text-yellow-200",
              low: "bg-blue-900 text-blue-200",
            }[v.severity];

            return (
              <div key={i} className={`border rounded-lg p-4 ${severityClass}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-lg">{v.package}</div>
                    {v.details && (
                      <div className="text-xs opacity-75 mt-1">
                        {v.details.summary ||
                          v.details.vulnerable_version_range ||
                          ""}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded ${badgeClass}`}
                    >
                      {v.severity.toUpperCase()}
                    </span>
                    <button
                      onClick={() => createTask(v.package, v.severity)}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded transition"
                    >
                      Create Task
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
