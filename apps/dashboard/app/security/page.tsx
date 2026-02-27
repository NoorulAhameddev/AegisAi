"use client";
import React, { useEffect, useState } from "react";

export default function SecurityPage() {
  const [summary, setSummary] = useState<any>(null);
  const [secret, setSecret] = useState<any>(null);

  useEffect(() => {
    fetch("/api/vulns")
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => null);
    fetch("/api/security-check")
      .then((r) => r.json())
      .then(setSecret)
      .catch(() => null);
  }, []);

  return (
    <main style={{ padding: 20 }}>
      <h1>Security</h1>
      <section>
        <h2>Vulnerabilities</h2>
        {!summary && <div>Loading...</div>}
        {summary && (
          <div>
            <div>
              Last scan:{" "}
              {summary.timestamp
                ? new Date(summary.timestamp).toLocaleString()
                : "unknown"}
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <div style={{ padding: 8, background: "#fff3f3", color: "#900" }}>
                Critical: {summary.counts?.critical || 0}
              </div>
              <div
                style={{ padding: 8, background: "#fff7e6", color: "#b35a00" }}
              >
                High: {summary.counts?.high || 0}
              </div>
              <div style={{ padding: 8, background: "#fffef0", color: "#666" }}>
                Moderate: {summary.counts?.moderate || 0}
              </div>
              <div style={{ padding: 8, background: "#f0fff4", color: "#0a6" }}>
                Low: {summary.counts?.low || 0}
              </div>
            </div>
            <h3 style={{ marginTop: 12 }}>Top offenders</h3>
            <ul>
              {summary.top &&
                summary.top.map((t: any, i: number) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <strong>{t.package}</strong> — {t.severity}{" "}
                    {t.fixAvailable ? "(fix available)" : ""}
                    <div style={{ marginTop: 4 }}>
                      <button
                        onClick={() => {
                          fetch("/api/tasks", {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({
                              title: `Upgrade ${t.package}`,
                              description: `Upgrade ${t.package}`,
                            }),
                          }).then((r) =>
                            r.ok ? alert("Task created") : alert("Failed"),
                          );
                        }}
                      >
                        Create Task
                      </button>
                      <button
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                          fetch("/api/auto-upgrade")
                            .then((r) => r.json())
                            .then((j) =>
                              alert(
                                "Enqueued upgrades: " +
                                  JSON.stringify(j.enqueuedJobIds || []),
                              ),
                            )
                            .catch((e) => alert("error"));
                        }}
                      >
                        Upgrade Packages
                      </button>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Secret Check</h2>
        {!secret && <div>Loading...</div>}
        {secret && (
          <div>
            <div>Passed: {String(secret.passed)}</div>
            {secret.issues &&
              secret.issues.map((it: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: 8,
                    borderLeft: `4px solid ${it.severity === "high" ? "#c33" : it.severity === "medium" ? "#e6a" : "#999"}`,
                    marginTop: 8,
                  }}
                >
                  <div>
                    <strong>{it.key}</strong> — {it.severity}
                  </div>
                  <div style={{ fontSize: 12 }}>{it.message}</div>
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}
