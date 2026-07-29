"use client";
import React, { useEffect, useState } from "react";

export default function JobDetails({ params }: any) {
  const { id } = params;
  const [log, setLog] = useState("");
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/jobs/" + id + "/stream");
    es.onmessage = (e) => setLog((prev) => prev + "\n" + e.data);
    es.onerror = () => es.close();
    return () => es.close();
  }, [id]);

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1
          style={{ color: "var(--color-text-primary)" }}
          className="text-3xl font-bold mb-2"
        >
          Job Details
        </h1>
        <p
          style={{ color: "var(--color-text-secondary)" }}
          className="text-base"
        >
          View detailed job output and logs
        </p>
      </div>

      <div className="mb-4">
        <button
          onClick={async () => {
            if (approving) return;
            setApproving(true);
            try {
              const res = await fetch(`/api/jobs/${id}/approve`, {
                method: "POST",
              });
              const body = await res.text();
              setLog(
                (prev) => prev + "\n[approve] " + (body || res.statusText),
              );
            } catch (e) {
              setLog((prev) => prev + "\n[approve error] " + String(e));
            } finally {
              setApproving(false);
            }
          }}
          disabled={approving}
          style={{
            backgroundColor: approving
              ? "var(--color-bg-tertiary)"
              : "var(--color-success)",
            color: "white",
            borderRadius: "var(--radius-md)",
          }}
          className="px-4 py-2 font-medium transition disabled:opacity-50"
        >
          {approving ? "Approving..." : "Approve"}
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#0a0c10",
          borderColor: "var(--color-border)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
        }}
        className="border"
      >
        <div
          style={{
            backgroundColor: "var(--color-bg-tertiary)",
            borderBottom: "1px solid var(--color-border)",
          }}
          className="px-4 py-3 flex items-center gap-2"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#f85149" }}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#d29922" }}
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: "#3fb950" }}
            />
          </div>
          <span
            style={{ color: "var(--color-text-secondary)" }}
            className="ml-2 text-sm font-mono"
          >
            job-{id.slice(0, 8)}.log
          </span>
        </div>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#0a0c10",
            color: "#3fb950",
            padding: "16px",
            fontFamily:
              "'SF Mono', 'Fira Code', 'Monaco', 'Consolas', monospace",
            fontSize: "13px",
            lineHeight: "1.6",
            maxHeight: "600px",
            overflowY: "auto",
          }}
        >
          {log || "Waiting for logs..."}
        </pre>
      </div>
    </div>
  );
}
