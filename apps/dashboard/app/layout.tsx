import "./globals.css";
import "./layout-global.css";
import Navigation from "./navigation";

export const metadata = {
  title: "ZedBoard",
  description: "Local-first personal security operations center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "var(--color-bg-primary)",
          color: "var(--color-text-primary)",
        }}
        className="min-h-screen"
      >
        <Navigation />
        <main className="w-full">
          <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
