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
    <main style={{ padding: 20 }}>
      <h1>Job {id}</h1>
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={async () => {
            if (approving) return;
            setApproving(true);
            try {
              const res = await fetch(`/api/jobs/${id}/approve`, { method: "POST" });
              const body = await res.text();
              setLog((prev) => prev + "\n[approve] " + (body || res.statusText));
            } catch (e) {
              setLog((prev) => prev + "\n[approve error] " + String(e));
            } finally {
              setApproving(false);
            }
          }}
          disabled={approving}
        >
          {approving ? "Approving..." : "Approve"}
        </button>
      </div>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#111",
          color: "#eee",
          padding: 12,
        }}
      >
        {log}
      </pre>
    </main>
  );
}
