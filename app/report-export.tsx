"use client";

import { useState } from "react";
import { reportBody, reportTitle } from "./report-markdown";

export function ReportExport({ markdown }: { markdown: string }) {
  const [feedback, setFeedback] = useState<{ markdown: string; message: string; error?: boolean }>();
  const current = feedback?.markdown === markdown ? feedback : undefined;

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setFeedback({ markdown, message });
    } catch {
      setFeedback({ markdown, message: "Clipboard access failed. Select the text and copy it manually.", error: true });
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    const name = reportTitle(markdown).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80).replace(/^-|-$/g, "");
    link.href = url;
    link.download = `${name || "issue-draft"}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="actions">
      <button type="button" disabled={!markdown.trim()} onClick={() => copy(markdown, "Copied Markdown.")}>Copy Markdown</button>
      <details className="disclosure export-menu">
        <summary className="button">Export</summary>
        <div className="disclosure-options">
          <button type="button" disabled={!markdown.trim()} onClick={() => copy(reportTitle(markdown), "Copied title.")}>Copy title</button>
          <button type="button" disabled={!reportBody(markdown)} onClick={() => copy(reportBody(markdown), "Copied issue body.")}>Copy issue body</button>
          <button type="button" disabled={!markdown.trim()} onClick={download}>Download Markdown</button>
        </div>
      </details>
      {current && <p role={current.error ? "alert" : "status"}>{current.message}</p>}
    </div>
  );
}
