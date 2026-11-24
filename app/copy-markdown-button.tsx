"use client";

import { useState } from "react";

export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [feedback, setFeedback] = useState<{
    markdown: string;
    status: "copied" | "error";
  } | null>(null);
  const status = feedback?.markdown === markdown ? feedback.status : null;

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setFeedback({ markdown, status: "copied" });
    } catch {
      setFeedback({ markdown, status: "error" });
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <button
        type="button"
        className="rounded border px-3 py-2 disabled:opacity-50"
        disabled={!markdown.trim()}
        onClick={copyMarkdown}
      >
        Copy Markdown
      </button>
      <span className="ml-2" role="status">{status === "copied" && "Copied"}</span>
      {status === "error" && (
        <p role="alert">Clipboard access failed. Select the Markdown in the editor and copy it manually.</p>
      )}
    </div>
  );
}
