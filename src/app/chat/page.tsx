"use client";

import { useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: "test-convo-1", // Fixed ID for now
          message: userMsg,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send message");
      }

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex h-screen flex-col bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4 text-lg font-semibold">
        AI Chat
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <p className="text-zinc-500">Welcome to the chat. Start typing...</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"
              }`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${m.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-200"
                }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p className="text-zinc-500 text-sm">Thinking...</p>}
      </div>

      <div className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 rounded bg-zinc-900 px-4 py-2 text-white outline-none ring-1 ring-zinc-700 focus:ring-white"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="rounded bg-white px-4 py-2 font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
