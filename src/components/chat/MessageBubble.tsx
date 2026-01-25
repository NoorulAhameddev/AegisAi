import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react";
import { useState } from "react";

interface MessageBubbleProps {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  onFeedback?: (helpful: boolean) => void;
}

export function MessageBubble({ role, content, onFeedback }: MessageBubbleProps) {
  const isUser = role === "USER";
  const [copied, setCopied] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (helpful: boolean) => {
    setFeedbackGiven(helpful);
    onFeedback?.(helpful);
  };

  if (role === "SYSTEM") {
    return (
      <div className="flex justify-center my-4 animate-slide-up">
        <span className="text-xs text-zinc-500 italic bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm hover:border-white/10 transition-colors">
          {content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full gap-4 md:gap-6 animate-slide-up group",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div className="shrink-0 mt-1">
          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-purple-600 to-purple-800 border border-purple-500/20 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300 group-hover:scale-105">
            <Bot className="h-5 w-5 text-white" />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "relative max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 shadow-lg text-sm md:text-base leading-7 transition-all duration-200 hover-glow",
            isUser
              ? "bg-linear-to-br from-white to-zinc-50 text-black font-medium rounded-tr-sm shadow-white/5"
              : "bg-zinc-900/50 backdrop-blur-xl border border-white/10 text-zinc-100 rounded-tl-sm hover:border-white/20 hover:bg-zinc-900/60"
          )}
        >
          <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-zinc-100 prose-a:text-blue-400 prose-a:underline prose-pre:my-2 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/10">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <div className="rounded-lg overflow-hidden my-3 border border-white/10 shadow-lg group/code">
                      <div className="bg-zinc-900/80 px-4 py-1.5 text-xs text-zinc-400 border-b border-white/5 flex justify-between items-center">
                        <span className="font-mono font-medium text-zinc-500">{match[1]}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="p-1 rounded text-xs text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                          aria-label="Copy code"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, background: 'rgba(0,0,0,0.4)' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code
                      className={cn(
                        "bg-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-purple-200",
                        className
                      )}
                      {...props}
                    >
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>

          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-lg border border-white/10"
              aria-label="Copy message"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
        </div>

        {/* Feedback section for AI responses */}
        {!isUser && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pl-12">
            <span className="text-xs text-zinc-600 mr-1">Helpful?</span>
            <button
              onClick={() => handleFeedback(true)}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                feedbackGiven === true
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30"
              )}
              aria-label="Helpful"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                feedbackGiven === false
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30"
              )}
              aria-label="Not helpful"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 mt-1">
          <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-600 to-blue-400 border border-blue-400/20 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300 group-hover:scale-105 text-xs font-bold text-white">
            <User className="h-5 w-5" />
          </div>
        </div>
      )}
    </div>
  );
}
