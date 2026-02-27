import "./globals.css";

export const metadata = {
  title: "Aegis Security Dashboard",
  description: "Local-first personal security dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col">
        <nav className="border-b border-slate-700 bg-slate-900 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold">
                S
              </div>
              <span className="text-lg font-semibold">Aegis Dashboard</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="/" className="hover:text-blue-400 transition">
                Overview
              </a>
              <a
                href="/vulnerabilities"
                className="hover:text-blue-400 transition"
              >
                Vulnerabilities
              </a>
              <a href="/tasks" className="hover:text-blue-400 transition">
                Tasks
              </a>
              <a href="/jobs" className="hover:text-blue-400 transition">
                Jobs
              </a>
              <a href="/activity" className="hover:text-blue-400 transition">
                Activity
              </a>
            </div>
          </div>
        </nav>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
