"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import Markdown from "react-markdown";
import { linkLogEvidence, logEvidence, type EvidenceLine } from "./log-evidence";
import { reportSections } from "./report-markdown";

export function MarkdownEditor({
  id,
  label,
  markdown,
  onChange,
  sourceLogs,
  onJumpToEvidence,
  actions,
}: {
  id: string;
  label: string;
  markdown: string;
  onChange: (markdown: string) => void;
  sourceLogs?: string;
  onJumpToEvidence?: (line: EvidenceLine) => void;
  actions?: ReactNode;
}) {
  const [preview, setPreview] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<string>();
  const editor = useRef<HTMLTextAreaElement>(null);
  const evidence = useMemo(() => logEvidence(sourceLogs ?? ""), [sourceLogs]);
  const evidencePlugin = useMemo(() => linkLogEvidence(evidence), [evidence]);
  const matches = selectedEvidence ? evidence.get(selectedEvidence) : undefined;

  function editSection(section: ReturnType<typeof reportSections>[number]) {
    setSelectedEvidence(undefined);
    let range = section.range;
    if (!range) {
      const updated = `${markdown.trimEnd()}\n\n## ${section.label}\n\n`.trimStart();
      onChange(updated);
      range = { start: updated.length, end: updated.length };
    }
    const { start, end } = range;
    setPreview(false);
    requestAnimationFrame(() => {
      editor.current?.focus();
      editor.current?.setSelectionRange(start, end);
    });
  }

  return (
    <div className="markdown-editor">
      <div className="editor-toolbar">
        <label id={`${id}-label`} htmlFor={preview ? undefined : id}>{label}</label>
        <div className="segmented" role="group" aria-label={`${label} view`}>
          <button type="button" aria-pressed={!preview} onClick={() => {
            setPreview(false);
            setSelectedEvidence(undefined);
          }}>Edit</button>
          <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>Preview</button>
        </div>
      </div>
      {preview ? (
        <div className="markdown-preview" role="region" aria-labelledby={`${id}-label`} tabIndex={0}>
          {markdown.trim() ? (
            <Markdown skipHtml disallowedElements={["img"]} rehypePlugins={evidence.size ? [evidencePlugin] : []}
              components={{
                button: ({ children, ...props }) => {
                  const token = (props as { "data-evidence"?: string })["data-evidence"] ?? String(children);
                  const lines = evidence.get(token);
                  if (!lines?.length) return <>{children}</>;
                  return <button className="evidence-link" type="button"
                    aria-label={`${token}, ${lines.length === 1 ? "jump to log line" : `show ${lines.length} matching log lines`}`}
                    onClick={() => {
                      if (lines.length === 1) {
                        setSelectedEvidence(undefined);
                        onJumpToEvidence?.(lines[0]);
                      } else {
                        setSelectedEvidence(token);
                        requestAnimationFrame(() => document.getElementById(`${id}-evidence`)?.focus());
                      }
                    }}>{children}</button>;
                },
              }}>{markdown}</Markdown>
          ) : <p>No Markdown to preview.</p>}
        </div>
      ) : (
        <textarea ref={editor} id={id} rows={11} value={markdown} onChange={(event) => onChange(event.target.value)} />
      )}
      {preview && matches && matches.length > 1 && (
        <section className="flow compact evidence-matches" aria-labelledby={`${id}-evidence`}>
          <h3 id={`${id}-evidence`} tabIndex={-1}>Matching log lines for {selectedEvidence}</h3>
          <ul>
            {matches.map((line) => <li key={line.number}><button type="button" onClick={() => onJumpToEvidence?.(line)}>
              Line {line.number} <code>{line.text}</code>
            </button></li>)}
          </ul>
        </section>
      )}
      {actions}
      <section className="report-checklist" aria-labelledby={`${id}-checklist`}>
        <h3 id={`${id}-checklist`}>Report checklist</h3>
        <ul>
          {reportSections(markdown).map((section) => (
            <li key={section.label}>
              <span>{section.label} <small>{section.present ? "Present" : "Missing"}</small></span>
              <button type="button" onClick={() => editSection(section)}>Edit<span className="sr-only"> {section.label}</span></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
