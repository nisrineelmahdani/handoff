import { useEffect, useRef } from "react";
import { diffLines } from "./line-diff";

export function ReportDiff({ approved, candidate }: { approved: string; candidate: string }) {
  const diff = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const pane = diff.current;
    const change = pane?.querySelector(".added, .removed");
    if (pane && change) {
      pane.scrollTop = change.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - 48;
    }
  }, [approved, candidate]);

  if (approved === candidate) return <p role="status">No changes from the approved draft.</p>;

  return (
    <ol ref={diff} className="line-diff" aria-label="Cloud edits" tabIndex={0}>
      {diffLines(approved, candidate).map(({ kind, text }, index) => (
        <li className={kind} key={index}>
          <span>
            {kind !== "unchanged" && <span className="diff-marker" aria-hidden="true">{kind === "added" ? "+" : "−"}</span>}
            {kind === "added" ? "Added" : kind === "removed" ? "Removed" : "Unchanged"}
          </span>
          <code>{text}</code>
        </li>
      ))}
    </ol>
  );
}
