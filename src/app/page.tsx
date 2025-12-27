import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4">
      <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
        AI Chat Platform 🚀
      </h1>
      <p className="text-zinc-400 text-lg mb-8 max-w-md text-center">
        Experience the future of conversation. Secure, fast, and intelligent.
      </p>

      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 transition"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
