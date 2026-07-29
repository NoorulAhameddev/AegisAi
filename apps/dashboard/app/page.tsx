export default function HomePage() {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 py-12">
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl p-8">
        <h1 className="text-3xl font-bold text-yellow-400 mb-4">
          ⚠️ Dashboard — Prototype Only
        </h1>
        <div className="space-y-4 text-yellow-200/80">
          <p>
            This dashboard is a{" "}
            <strong className="text-yellow-300">prototype</strong> and is{" "}
            <strong className="text-red-400">NOT production-ready</strong>.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>All API routes are unauthenticated — anyone can access them</li>
            <li>
              Previously contained{" "}
              <code className="bg-yellow-900/40 px-1 rounded">eval()</code> and
              dynamic{" "}
              <code className="bg-yellow-900/40 px-1 rounded">require()</code>{" "}
              calls (now removed)
            </li>
            <li>No input validation on job IDs — path traversal risk</li>
            <li>
              SSE log streaming had resource exhaustion bug (now fixed with
              5-min timeout)
            </li>
            <li>No rate limiting, no CSRF protection, no CORS</li>
          </ul>
          <p className="text-yellow-300 font-semibold mt-6">
            Do not deploy this app to a public server.
          </p>
          <p className="text-sm text-yellow-200/60">
            For production monitoring, use Azure Monitor, Datadog, or Grafana
            instead.
          </p>
        </div>
      </div>
    </div>
  );
}
