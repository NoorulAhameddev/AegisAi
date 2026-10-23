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
        "border-l border-hair bg-ink-900 transition-all duration-300 ease-in-out flex flex-col overflow-hidden",
        isFullscreen
          ? "fixed inset-0 z-50 bg-ink-950"
          : "w-0 md:w-[450px] lg:w-[600px] shrink-0",
        isOpen && !isFullscreen ? "opacity-100 translate-x-0 border-l" : "",
        !isOpen && !isFullscreen
          ? "w-0 opacity-0 translate-x-12 border-l-0"
          : "",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-hair bg-ink-950">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink-100">
            Artifact Preview
          </span>
          <span className="text-xs text-ink-500 font-mono uppercase">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isRenderable && (
            <div className="flex bg-ink-850 border border-hair p-0.5 mr-2">
              <button
                onClick={() => setActiveTab("preview")}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5",
                  activeTab === "preview"
                    ? "bg-brand text-ink-950"
                    : "text-ink-500 hover:text-ink-100 hover:bg-ink-800",
                )}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={cn(
                  "px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5",
                  activeTab === "code"
                    ? "bg-ink-700 text-ink-100"
                    : "text-ink-500 hover:text-ink-100 hover:bg-ink-800",
                )}
              >
                <Code className="h-3.5 w-3.5" /> Code
              </button>
            </div>
          )}

          <button
            onClick={() => setKey((p) => p + 1)}
            className="p-1.5 text-ink-500 hover:text-ink-100 hover:bg-ink-800 transition-colors"
            title="Reload Preview"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-ink-500 hover:text-ink-100 hover:bg-ink-800 transition-colors"
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
            className="p-1.5 text-ink-500 hover:text-ink-100 hover:bg-ink-800 transition-colors ml-1"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-ink-950 relative">
        {activeTab === "preview" && isRenderable ? (
          <div className="h-full w-full flex flex-col">
            {/* Safe Preview Construction */}
            {language === "html" && (
              <iframe
                key={key}
                srcDoc={DOMPurify.sanitize(content, {
                  USE_PROFILES: { html: true },
                })}
                className="w-full h-full bg-cream"
                sandbox="allow-scripts"
                title="Preview"
              />
            )}
            {language === "svg" && (
              <div
                className="w-full h-full flex items-center justify-center bg-[url('/grid.svg')] bg-ink-900"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(content, {
                    USE_PROFILES: { svg: true },
                  }),
                }}
              />
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-ink-700">
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
