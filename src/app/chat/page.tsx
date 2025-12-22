export default function ChatPage() {
  return (
    <main className="flex h-screen flex-col bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4 text-lg font-semibold">
        AI Chat
      </header>

      <div className="flex-1 overflow-y-auto p-6 text-zinc-400">
        <p>Welcome to the chat.</p>
        <p className="mt-2 text-sm">
          AI responses will appear here.
        </p>
      </div>

      <div className="border-t border-zinc-800 p-4">
        <input
          placeholder="Type your message..."
          className="w-full rounded bg-zinc-900 px-4 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-white"
        />
      </div>
    </main>
  );
}
