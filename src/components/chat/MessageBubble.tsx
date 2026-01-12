import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "katex/dist/katex.min.css";
import { Bot, User, Copy, Check } from "lucide-react";
import { useState } from "react";

interface MessageBubbleProps {
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "USER";
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (role === "SYSTEM") {
    return (
      <div className="flex justify-center my-4">
        <span className="text-xs text-zinc-500 italic bg-zinc-900/50 px-3 py-1 rounded-full border border-white/5">
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
          <div className="h-8 w-8 rounded-xl bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center shadow-lg group-hover:shadow-purple-500/10 transition-shadow">
            <Bot className="h-5 w-5 text-purple-400" />
          </div>
        </div>
      )}

      <div
        className={cn(
          "relative max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm text-sm md:text-base leading-7 transition-all duration-200",
          isUser
            ? "bg-white text-black font-medium rounded-tr-sm"
            : "bg-zinc-900/40 backdrop-blur-md border border-white/10 text-zinc-100 rounded-tl-sm hover:border-white/20"
        )}
      >
        <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-headings:text-zinc-100 prose-a:text-blue-400 prose-pre:my-2 prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/10">
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
                      <div className="flex gap-1" />
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
            className="absolute -bottom-6 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
            aria-label="Copy message"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {isUser && (
        <div className="shrink-0 mt-1">
          <div className="h-8 w-8 rounded-full bg-linear-to-tr from-blue-600 to-blue-500 border border-white/10 flex items-center justify-center shadow-lg text-xs font-bold text-white">
            <User className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  );
}
