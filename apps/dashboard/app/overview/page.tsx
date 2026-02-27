"use client";
import React, { useEffect, useState } from "react";

type StatusPayload = {
  branch?: string;
  uncommitted?: number;
  queueMode?: string;
  jobs?: { success: number; failed: number; queued: number };
  lastAudit?: string | null;
};

function Card({ children, style = {} }: any) {
  return (
    <div
      style={{
        background: "#0f1724",
        color: "#e6eef8",
        padding: 16,
        borderRadius: 8,
        minWidth: 200,
        boxShadow: "0 1px 3px rgba(2,6,23,0.6)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Indicator({ level }: { level: "clean" | "warning" | "critical" }) {
  const color =
    level === "clean" ? "#16a34a" : level === "warning" ? "#f59e0b" : "#ef4444";
  return (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 6,
        background: color,
        marginRight: 8,
        boxShadow: "0 0 0 4px rgba(0,0,0,0.25) inset",
      }}
    />
  );
}

export default function OverviewPage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [payload, setPayload] = useState<StatusPayload | null>(null);
  const [vulns, setVulns] = useState<any | null>(null);
  const [secretCheck, setSecretCheck] = useState<any | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus("loading");
      try {
        const [sres, vres] = await Promise.all([
          fetch("/api/status"),
          fetch("/api/vulns"),
        ]);
        const sjson = sres.ok ? await sres.json() : null;
        const vjson = vres.ok ? await vres.json() : null;
        if (!mounted) return;
        setPayload(sjson);
        setVulns(vjson);
        setStatus("ready");
      } catch (e) {
        setStatus("error");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function runJob(type: string, extra: any = {}) {
    setActionBusy(type);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.assign({ type }, extra)),
      });
      if (res.ok) {
        const j = await res.json();
        try {
          const s = await fetch("/api/status");
          if (s.ok) setPayload(await s.json());
        } catch (e) {}
        alert("Enqueued: " + (j.jobId || JSON.stringify(j)));
      } else {
        const txt = await res.text();
        alert("Failed: " + txt);
      }
    } catch (e) {
      alert(String(e));
    } finally {
      setActionBusy(null);
    }
  }

  async function runSecretCheck() {
    setActionBusy("secret-check");
    try {
      const res = await fetch("/api/security-check");
      if (!res.ok) {
        const t = await res.text();
        setSecretCheck({ passed: false, issues: [{ message: t }] });
      } else {
        const j = await res.json();
        setSecretCheck(j);
      }
    } catch (e) {
      setSecretCheck({ passed: false, issues: [{ message: String(e) }] });
    } finally {
      setActionBusy(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard?.writeText(text).then(
      () => alert("Copied to clipboard"),
      () => alert("Copy failed"),
    );
  }

  return (
    <main
      style={{
        padding: 20,
        fontFamily:
          'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
    >
      <h1 style={{ margin: 0 }}>Overview</h1>
      <div style={{ color: "#9aa7b8", marginTop: 6 }}>
        System health and quick actions
      </div>

      {status === "loading" && (
        <div style={{ marginTop: 20 }}>Loading status…</div>
      )}
      {status === "error" && (
        <div style={{ marginTop: 20, color: "#f43f5e" }}>
          Failed to load status
        </div>
      )}

      {status === "ready" && (
        <div
          style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap" }}
        >
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#90a4b6" }}>
                  Vulnerabilities
                </div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>
                  {vulns?.summary?.total || 0}
                </div>
                <div style={{ fontSize: 12, color: "#90a4b6" }}>
                  {vulns?.summary?.critical || 0} critical
                </div>
              </div>
              <div>
                <Indicator
                  level={
                    (vulns?.summary?.critical || 0) > 0
                      ? "critical"
                      : (vulns?.summary?.high || 0) > 0
                        ? "warning"
                        : "clean"
                  }
                />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={!!actionBusy}
                onClick={() => runJob("npm-audit")}
              >
                {actionBusy === "npm-audit" ? "Enqueuing…" : "Run audit"}
              </button>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 12, color: "#90a4b6" }}>Jobs</div>
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {payload?.jobs?.queued ?? 0}
                </div>
                <div style={{ fontSize: 11, color: "#90a4b6" }}>Queued</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {payload?.jobs?.failed ?? 0}
                </div>
                <div style={{ fontSize: 11, color: "#90a4b6" }}>Failed</div>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {payload?.jobs?.success ?? 0}
                </div>
                <div style={{ fontSize: 11, color: "#90a4b6" }}>Succeeded</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={!!actionBusy}
                onClick={() => runJob("test-run")}
              >
                {actionBusy === "test-run" ? "Enqueuing…" : "Run tests"}
              </button>
              <button
                style={{ marginLeft: 8 }}
                disabled={!!actionBusy}
                onClick={() => runJob("format")}
              >
                {actionBusy === "format" ? "Enqueuing…" : "Run format"}
              </button>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 12, color: "#90a4b6" }}>Audit</div>
            <div style={{ marginTop: 8, fontWeight: 700 }}>
              {payload?.lastAudit
                ? new Date(payload.lastAudit).toLocaleString()
                : "never"}
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                disabled={!!actionBusy}
                onClick={() => runJob("npm-audit")}
              >
                {actionBusy === "npm-audit" ? "Enqueuing…" : "Run audit"}
              </button>
            </div>
          </Card>

          <Card style={{ minWidth: 280 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#90a4b6" }}>Repository</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>
                  {payload?.branch || "unknown"}
                </div>
                <div style={{ fontSize: 12, color: "#90a4b6" }}>
                  {payload?.uncommitted
                    ? `${payload.uncommitted} uncommitted changes`
                    : "clean"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#90a4b6" }}>Queue</div>
                <div style={{ fontWeight: 700 }}>{payload?.queueMode}</div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={() => copyToClipboard("code .")}>
                Copy `code .`
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://marketplace.visualstudio.com/items?itemName=MS-vsliveshare.vsliveshare",
                    "_blank",
                  )
                }
              >
                Live Share
              </button>
            </div>
          </Card>

          <Card
            style={{
              flexBasis: "100%",
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ flex: "1 1 0" }}>
              <div style={{ fontSize: 12, color: "#90a4b6" }}>Secret Check</div>
              <div style={{ marginTop: 6 }}>
                {secretCheck
                  ? secretCheck.passed
                    ? "Passed"
                    : "Issues found"
                  : "Not run"}
              </div>
            </div>
            <div>
              <button disabled={!!actionBusy} onClick={runSecretCheck}>
                {actionBusy === "secret-check"
                  ? "Running…"
                  : "Run secret-check"}
              </button>
            </div>
          </Card>
        </div>
      )}

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 8 }}>Quick Actions</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={!!actionBusy} onClick={() => runJob("npm-audit")}>
            Run audit
          </button>
          <button
            disabled={!!actionBusy}
            onClick={() => {
              runSecretCheck();
            }}
          >
            Run secret-check
          </button>
          <button disabled={!!actionBusy} onClick={() => runJob("test-run")}>
            Run tests
          </button>
          <button disabled={!!actionBusy} onClick={() => runJob("format")}>
            Run format
          </button>
          <button onClick={() => copyToClipboard("code .")}>
            Open VS Code (copy cmd)
          </button>
          <button
            onClick={() =>
              window.open(
                "vscode://vscode.microsoft.com/extension/ms-vsliveshare.vsliveshare",
                "_blank",
              )
            }
          >
            Start Live Share
          </button>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ marginBottom: 8 }}>Metrics</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Card>
            <div style={{ fontSize: 12, color: "#90a4b6" }}>Total jobs</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {(payload?.jobs?.queued || 0) +
                (payload?.jobs?.failed || 0) +
                (payload?.jobs?.success || 0)}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 12, color: "#90a4b6" }}>Failed jobs</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {payload?.jobs?.failed ?? 0}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 12, color: "#90a4b6" }}>
              Upgrade success rate
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {(() => {
                const s = payload?.jobs?.success ?? 0;
                const f = payload?.jobs?.failed ?? 0;
                const tot = s + f;
                return tot === 0 ? "—" : Math.round((s / tot) * 100) + "%";
              })()}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
