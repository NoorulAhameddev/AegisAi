"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Send,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  Lightbulb,
} from "lucide-react";
import { logger } from "@/lib/logger";
import { logger } from "@/lib/logger";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: string[];
  thinking?: string;
}

interface AdvancedChatProps {
  onSendMessage: (message: string, context?: string) => Promise<string>;
  loading?: boolean;
  suggestedQuestions?: string[];
}

export function AdvancedChat({
  onSendMessage,
  loading = false,
  suggestedQuestions = [],
}: AdvancedChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await onSendMessage(input);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: response,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleCopy = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (message) {
      navigator.clipboard.writeText(message.content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleRegenerate = async (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex > 0) {
      const prevUserMessage = messages[messageIndex - 1];
      const updatedMessages = messages.slice(0, messageIndex);
      setMessages(updatedMessages);

      try {
        const response = await onSendMessage(prevUserMessage.content);
        const assistantMessage: Message = {
          id: `msg-${Date.now()}-regenerated`,
          role: "assistant",
          content: response,
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        logger.error("Regeneration failed:", error);
      }
    }
  };

  if (messages.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <Lightbulb size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-6">
            No messages yet. Start a conversation!
          </p>
        </div>

        {suggestedQuestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">
              Suggested questions:
            </p>
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInput(q);
                }}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition"
              >
                <p className="text-sm text-gray-700">{q}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-l-lg rounded-tr-lg"
                  : "bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg"
              } p-4`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>

              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 space-y-1">
                  <p className="text-xs font-semibold opacity-70">Sources:</p>
                  {message.sources.map((source, idx) => (
                    <p key={idx} className="text-xs opacity-70">
                      • {source}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                <span>{message.timestamp}</span>
                {message.role === "assistant" && (
                  <>
                    <button
                      onClick={() => handleCopy(message.id)}
                      className="hover:opacity-100 transition"
                    >
                      {copiedId === message.id ? (
                        <Check size={14} />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => handleRegenerate(message.id)}
                      className="hover:opacity-100 transition"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-r-lg rounded-tl-lg p-4">
              <Loader2 size={18} className="animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type your message..."
          disabled={loading}
        />
        <button
          onClick={handleSendMessage}
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
