import { useState, useEffect } from "react";
import { X, Code, Eye, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import DOMPurify from "isomorphic-dompurify";

interface ArtifactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  language: string;
}

export function ArtifactsPanel({
  isOpen,
  onClose,
  content,
  language,
}: ArtifactsPanelProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [key, setKey] = useState(0); // To force re-render of iframe

  // Reset to preview when content changes
  useEffect(() => {
    setActiveTab("preview");
    setKey((prev) => prev + 1);
  }, [content]);

  if (!isOpen) return null;

  const isRenderable = ["html", "svg"].includes(language.toLowerCase());

  return (
    <div
      className={cn(
        "border-l border-white/10 bg-zinc-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
        isFullscreen
          ? "fixed inset-0 z-50 bg-zinc-950"
          : "w-0 md:w-[450px] lg:w-[600px] shrink-0",
        isOpen && !isFullscreen ? "opacity-100 translate-x-0 border-l" : "",
        !isOpen && !isFullscreen
          ? "w-0 opacity-0 translate-x-12 border-l-0"
          : "",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">
            Artifact Preview
          </span>
          <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded uppercase">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isRenderable && (
            <div className="flex bg-zinc-800 rounded-lg p-0.5 mr-2 border border-white/5">
              <button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                  activeTab === "preview"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5",
                )}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5",
                  activeTab === "code"
                    ? "bg-zinc-700 text-white shadow-sm"
                    : "text-zinc-400 hover:text-white hover:bg-white/5",
                )}
              >
                <Code className="h-3.5 w-3.5" /> Code
              </button>
            </div>
          )}

          <button
            onClick={() => setKey((p) => p + 1)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Reload Preview"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-zinc-950/50 relative">
        {activeTab === "preview" && isRenderable ? (
          <div className="h-full w-full flex flex-col">
            {/* Safe Preview Construction */}
            {language === "html" && (
              <iframe
                key={key}
                srcDoc={content}
                className="w-full h-full bg-white"
                sandbox="allow-scripts" // Be careful with permissions
                title="Preview"
              />
            )}
            {language === "svg" && (
              <div
                className="w-full h-full flex items-center justify-center bg-[url('/grid.svg')] bg-zinc-900"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(content, {
                    USE_PROFILES: { svg: true },
                  }),
                }}
              />
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            <SyntaxHighlighter
              language={language}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: "1.5rem",
                background: "transparent",
                fontSize: "14px",
              }}
              showLineNumbers
            >
              {content}
            </SyntaxHighlighter>
          </div>
        )}
      </div>
    </div>
  );
}
