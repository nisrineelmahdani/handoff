"use client";

import { useRef, useState } from "react";

const maxFileSize = 1024 * 1024;

export function LogFileImport({ onImport, sourceVersion }: {
  onImport: (text: string, filename: string) => void;
  sourceVersion: { current: number };
}) {
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const readVersion = useRef(0);

  async function openFile(file?: File) {
    if (!file) return;
    setError("");
    const id = ++readVersion.current;
    const version = sourceVersion.current;
    if (!/\.(log|txt)$/i.test(file.name)) return setError("Choose a .log or .txt file.");
    if (file.size > maxFileSize) return setError("This file is too large. Choose a file up to 1 MB.");
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      if (id !== readVersion.current || version !== sourceVersion.current) return;
      if (!text.trim()) return setError("This file is empty.");
      if (text.includes("\0")) return setError("Could not read this file as UTF-8 text.");
      onImport(text, file.name);
    } catch {
      if (id === readVersion.current && version === sourceVersion.current) setError("Could not read this file as UTF-8 text.");
    }
  }

  return (
    <div className={`file-import${dragging ? " dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length > 1) {
          readVersion.current++;
          setError("Choose one log file at a time.");
        } else void openFile(event.dataTransfer.files[0]);
      }}>
      <input ref={fileInput} type="file" accept=".log,.txt" hidden onChange={(event) => {
        void openFile(event.target.files?.[0]);
        event.target.value = "";
      }} />
      <button type="button" onClick={() => fileInput.current?.click()}>Choose log file</button>
      <span className="muted">or drop a .log or .txt file here · up to 1 MB</span>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
