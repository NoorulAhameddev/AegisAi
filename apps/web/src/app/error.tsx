"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-ink-100">
      <div className="text-center space-y-6 p-8">
        <h2 className="font-display text-3xl font-medium tracking-tight">Something went wrong</h2>
        <p className="text-zinc-400 max-w-md">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-brand text-ink-950 font-medium hover:bg-brand-dim transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
