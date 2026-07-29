"use client";
import React, { useState, useEffect } from "react";

interface Job {
  id: string;
  type: string;
  status: "queued" | "running" | "succeeded" | "failed";
  createdAt: string;
  completedAt?: string;
  error?: string;
  logs?: string[];
}

const statusConfig: Record<
  string,
  { color: string; bg: string; label: string; dot: string }
> = {
  queued: {
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.1)",
    label: "Queued",
    dot: "#3b82f6",
  },
  running: {
    color: "#eab308",
    bg: "rgba(234, 179, 8, 0.1)",
    label: "Running",
    dot: "#eab308",
  },
  succeeded: {
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.1)",
    label: "Succeeded",
    dot: "#22c55e",
  },
  failed: {
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.1)",
    label: "Failed",
    dot: "#ef4444",
  },
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch("/api/jobs");
        if (res.ok) {
          const data = await res.json();
          setJobs(data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="opacity-0 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2">Jobs</h1>
        <p className="text-zinc-500">Monitor background job execution</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Jobs List */}
        <div className="space-y-3">
          {loading ? (
            <div
              className="rounded-xl border p-6"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="skeleton h-20 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <div
              className="rounded-xl border p-8 text-center"
              style={{
                backgroundColor: "var(--color-bg-secondary)",
                borderColor: "var(--color-border)",
              }}
            >
              <p className="text-zinc-500">No jobs found</p>
            </div>
          ) : (
            jobs.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                isSelected={selectedJob?.id === job.id}
                onClick={() => setSelectedJob(job)}
                delay={i * 50}
              />
            ))
          )}
        </div>

        {/* Logs Panel */}
        <div
          className="rounded-xl border overflow-hidden opacity-0 animate-fade-in-up"
          style={{
            backgroundColor: "#09090b",
            borderColor: "var(--color-border)",
            animationDelay: "300ms",
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{
              backgroundColor: "var(--color-bg-tertiary)",
              borderColor: "var(--color-border)",
            }}
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-sm text-zinc-500 ml-2 font-mono">
                terminal
              </span>
            </div>
            {selectedJob && (
              <span className="text-xs text-zinc-500">
                {selectedJob.type} · {selectedJob.id.slice(0, 8)}
              </span>
            )}
          </div>
          {selectedJob ? (
            <div
              className="p-4 overflow-auto font-mono text-xs"
              style={{
                backgroundColor: "#09090b",
                color: "#22c55e",
                maxHeight: "500px",
              }}
            >
              <div className="text-zinc-500 mb-2">$ {selectedJob.type}</div>
              <div className="text-zinc-600 mb-4">
                Started: {new Date(selectedJob.createdAt).toLocaleString()}
              </div>
              {selectedJob.logs && selectedJob.logs.length > 0 && (
                <>
                  <div className="text-zinc-700 my-3">{"─".repeat(60)}</div>
                  {selectedJob.logs.map((log, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-zinc-600">{">"}</span> {log}
                    </div>
                  ))}
                </>
              )}
              {selectedJob.completedAt && (
                <>
                  <div className="text-zinc-700 my-3">{"─".repeat(60)}</div>
                  <div
                    style={{
                      color:
                        selectedJob.status === "succeeded"
                          ? "#22c55e"
                          : "#ef4444",
                    }}
                  >
                    {selectedJob.status === "succeeded"
                      ? "✓ Completed successfully"
                      : "✗ Failed"}
                  </div>
                </>
              )}
              {selectedJob.status === "running" && (
                <div
                  className="mt-4 flex items-center gap-2"
                  style={{ color: "#eab308" }}
                >
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: "#eab308" }}
                  />
                  Running...
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Select a job to view logs
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function JobCard({
  job,
  isSelected,
  onClick,
  delay,
}: {
  job: Job;
  isSelected: boolean;
  onClick: () => void;
  delay: number;
}) {
  const config = statusConfig[job.status];

  return (
    <div
      onClick={onClick}
      className="rounded-xl border p-4 card-hover cursor-pointer opacity-0 animate-fade-in-up"
      style={{
        backgroundColor: isSelected
          ? "var(--color-bg-tertiary)"
          : "var(--color-bg-secondary)",
        borderColor: isSelected ? config.color : "var(--color-border)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-sm text-zinc-200 mb-1">{job.type}</h4>
          <p className="text-xs text-zinc-500">
            {new Date(job.createdAt).toLocaleString()}
          </p>
        </div>
        <span
          style={{ backgroundColor: config.bg, color: config.color }}
          className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: config.dot }}
          />
          {config.label}
        </span>
      </div>
      {job.error && (
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
          }}
          className="text-xs p-2 rounded-lg"
        >
          {job.error}
        </div>
      )}
    </div>
  );
}
