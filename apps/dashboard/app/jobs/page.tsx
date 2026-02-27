"use client";
import React, { useEffect, useState } from "react";

type JobStatus =
  | "pending"
  | "pending-approval"
  | "running"
  | "completed"
  | "failed";

interface Job {
  id: string;
  type: string;
  status: JobStatus;
  approved?: boolean;
  createdAt?: number;
  startedAt?: number;
  completedAt?: number;
  output?: string;
  error?: string;
}

const StatusColors: Record<JobStatus, string> = {
  pending: "bg-blue-900/30 border-blue-700 text-blue-300",
  "pending-approval": "bg-yellow-900/30 border-yellow-700 text-yellow-300",
  running: "bg-purple-900/30 border-purple-700 text-purple-300",
  completed: "bg-green-900/30 border-green-700 text-green-300",
  failed: "bg-red-900/30 border-red-700 text-red-300",
};

const StatusBadges: Record<JobStatus, string> = {
  pending: "bg-blue-900 text-blue-200",
  "pending-approval": "bg-yellow-900 text-yellow-200",
  running: "bg-purple-900 text-purple-200",
  completed: "bg-green-900 text-green-200",
  failed: "bg-red-900 text-red-200",
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
    setLoading(false);
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch("/api/jobs");
      if (!res.ok) return;
      const list = await res.json();
      setJobs(list);
    } catch (e) {
      console.error(e);
    }
  }

  async function approveJob(id: string) {
    if (!confirm("Approve this job?")) return;
    setApprovingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}/approve`, { method: "POST" });
      if (res.ok) {
        await fetchJobs();
        alert("Job approved");
      } else {
        const text = await res.text();
        alert("Approve failed: " + text);
      }
    } catch (e) {
      alert("Approve error: " + String(e));
    } finally {
      setApprovingId(null);
    }
  }

  const selected = jobs.find((j) => j.id === selectedId);
  const countByStatus = {
    pending: jobs.filter((j) => j.status === "pending").length,
    "pending-approval": jobs.filter((j) => j.status === "pending-approval")
      .length,
    running: jobs.filter((j) => j.status === "running").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Jobs</h1>
        <p className="text-slate-400">Monitor background job execution</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
          <div className="text-xs text-blue-300">Pending</div>
          <div className="text-2xl font-bold text-blue-400">
            {countByStatus.pending}
          </div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
          <div className="text-xs text-yellow-300">Needs Approval</div>
          <div className="text-2xl font-bold text-yellow-400">
            {countByStatus["pending-approval"]}
          </div>
        </div>
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-3">
          <div className="text-xs text-purple-300">Running</div>
          <div className="text-2xl font-bold text-purple-400">
            {countByStatus.running}
          </div>
        </div>
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
          <div className="text-xs text-green-300">Completed</div>
          <div className="text-2xl font-bold text-green-400">
            {countByStatus.completed}
          </div>
        </div>
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
          <div className="text-xs text-red-300">Failed</div>
          <div className="text-2xl font-bold text-red-400">
            {countByStatus.failed}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="text-slate-400">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center text-slate-400">
          <p>No jobs yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedId(job.id)}
              className={`border rounded-lg p-4 cursor-pointer transition hover:bg-slate-800/50 ${
                StatusColors[job.status] || "bg-slate-700"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold text-lg mb-1">{job.type}</div>
                  <div className="text-sm opacity-75 font-mono">{job.id}</div>
                  {job.createdAt && (
                    <div className="text-xs opacity-60 mt-1">
                      Created {new Date(job.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-start">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded whitespace-nowrap ${
                      StatusBadges[job.status]
                    }`}
                  >
                    {job.status === "pending-approval"
                      ? "Needs Approval"
                      : job.status.charAt(0).toUpperCase() +
                        job.status.slice(1)}
                  </span>
                  {(job.status === "pending-approval" ||
                    (job.type === "dependency-upgrade" && !job.approved)) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        approveJob(job.id);
                      }}
                      disabled={approvingId === job.id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm px-3 py-1 rounded transition whitespace-nowrap"
                    >
                      {approvingId === job.id ? "Approving..." : "Approve"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job Details Modal */}
      {selected && (
        <div
          className="fixed left-0 top-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-slate-800 border border-slate-700 rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selected.type}</h2>
                <p className="text-slate-400 font-mono text-sm">
                  {selected.id}
                </p>
              </div>
              <span
                className={`text-sm font-semibold px-3 py-1 rounded ${
                  StatusBadges[selected.status]
                }`}
              >
                {selected.status === "pending-approval"
                  ? "Needs Approval"
                  : selected.status.charAt(0).toUpperCase() +
                    selected.status.slice(1)}
              </span>
            </div>

            {/* Timestamps */}
            <div className="bg-slate-900/50 rounded p-3 mb-4 text-sm">
              {selected.createdAt && (
                <div className="text-slate-400">
                  Created: {new Date(selected.createdAt).toLocaleString()}
                </div>
              )}
              {selected.startedAt && (
                <div className="text-slate-400">
                  Started: {new Date(selected.startedAt).toLocaleString()}
                </div>
              )}
              {selected.completedAt && (
                <div className="text-slate-400">
                  Completed: {new Date(selected.completedAt).toLocaleString()}
                </div>
              )}
            </div>

            {/* Output/Error */}
            {selected.output ? (
              <div>
                <h3 className="font-semibold mb-2">Output</h3>
                <pre className="bg-slate-900 rounded p-3 text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto text-slate-300">
                  {selected.output}
                </pre>
              </div>
            ) : selected.error ? (
              <div>
                <h3 className="font-semibold mb-2 text-red-300">Error</h3>
                <pre className="bg-red-900/20 border border-red-700 rounded p-3 text-xs whitespace-pre-wrap break-words text-red-200">
                  {selected.error}
                </pre>
              </div>
            ) : (
              <div className="text-slate-400 text-sm">No output yet</div>
            )}

            <button
              onClick={() => setSelectedId(null)}
              className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
