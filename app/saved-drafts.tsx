"use client";

import { useEffect, useRef, useState } from "react";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore/lite";
import { firebaseApp } from "../firebase";
import { CopyMarkdownButton } from "./copy-markdown-button";

type SavedDraft = {
  id: string;
  title: string;
  markdown: string;
};

let pendingDraftSession: Promise<string> | undefined;

function getDraftUid(): Promise<string> {
  pendingDraftSession ??= (async () => {
    const auth = getAuth(firebaseApp);
    await auth.authStateReady();
    return (auth.currentUser ?? (await signInAnonymously(auth)).user).uid;
  })().finally(() => {
    pendingDraftSession = undefined;
  });

  return pendingDraftSession;
}

function draftsCollection(uid: string) {
  return collection(getFirestore(firebaseApp), "users", uid, "drafts");
}

function draftTitle(markdown: string): string {
  const heading = markdown.match(/^ {0,3}#[ \t]+(.+)$/m)?.[1];
  return (heading ?? markdown.split(/\r?\n/).find((line) => line.trim()))
    ?.trim() || "Untitled draft";
}

export function SaveDraftButton({
  markdown,
  onSaved,
  draftId,
}: {
  markdown: string;
  onSaved: () => void;
  draftId?: string;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedMarkdown, setSavedMarkdown] = useState<string>();
  const saving = useRef(false);
  const newDraftId = useRef<string | undefined>(undefined);

  async function save() {
    if (saving.current || !markdown.trim()) {
      return;
    }

    saving.current = true;
    setStatus("saving");
    try {
      const uid = await getDraftUid();
      const drafts = draftsCollection(uid);
      const id = draftId ?? newDraftId.current;
      const reference = id === undefined ? doc(drafts) : doc(drafts, id);
      if (draftId === undefined) {
        newDraftId.current = reference.id;
      }
      await setDoc(reference, {
        title: draftTitle(markdown),
        markdown,
        updatedAt: serverTimestamp(),
      });
      setSavedMarkdown(markdown);
      setStatus("saved");
      onSaved();
    } catch {
      setStatus("error");
    } finally {
      saving.current = false;
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <button
        type="button"
        className="rounded border px-3 py-2 disabled:opacity-50"
        disabled={status === "saving" || !markdown.trim()}
        onClick={save}
      >
        {status === "saving" ? "Saving…" : "Save draft"}
      </button>
      {status === "saved" && (
        <p role="status">
          {markdown === savedMarkdown ? "Draft saved." : "Draft saved. Newer edits are unsaved."}
        </p>
      )}
      {status === "error" && (
        <p role="alert">Could not save the draft. Check your connection and try again. Your edits are still here.</p>
      )}
    </div>
  );
}

export function SavedDrafts({
  refreshVersion,
  onSaved,
}: {
  refreshVersion: number;
  onSaved: () => void;
}) {
  const [list, setList] = useState<{ version: number; drafts: SavedDraft[] | null }>();
  const [retry, setRetry] = useState(0);
  const [opened, setOpened] = useState<SavedDraft | null>(null);
  const currentList = list?.version === refreshVersion + retry ? list.drafts : undefined;

  useEffect(() => {
    let active = true;
    const version = refreshVersion + retry;

    async function loadDrafts() {
      try {
        const uid = await getDraftUid();
        const snapshot = await getDocs(query(draftsCollection(uid), orderBy("updatedAt", "desc")));
        if (active) {
          setList({
            version,
            drafts: snapshot.docs.map((draft) => {
              const { title, markdown } = draft.data();
              return { id: draft.id, title, markdown };
            }),
          });
        }
      } catch {
        if (active) {
          setList({ version, drafts: null });
        }
      }
    }

    void loadDrafts();
    return () => { active = false; };
  }, [refreshVersion, retry]);

  return (
    <section className="space-y-3" aria-labelledby="saved-drafts-heading">
      <h2 id="saved-drafts-heading" className="font-semibold">Saved drafts</h2>
      {currentList === undefined && <p role="status">Loading saved drafts…</p>}
      {currentList === null && (
        <div>
          <p role="alert">Could not load saved drafts. Check your connection and Firebase setup.</p>
          <button type="button" className="mt-2 rounded border px-3 py-2" onClick={() => setRetry((count) => count + 1)}>
            Retry
          </button>
        </div>
      )}
      {currentList?.length === 0 && <p>No saved drafts yet.</p>}
      {currentList && currentList.length > 0 && (
        <ul className="space-y-2">
          {currentList.map((draft) => (
            <li key={draft.id}>
              <button
                type="button"
                className="rounded border px-3 py-2 text-left"
                onClick={() => {
                  if (opened?.id !== draft.id) {
                    setOpened(draft);
                  }
                }}
              >
                {draft.title}
              </button>
            </li>
          ))}
        </ul>
      )}
      {opened !== null && (
        <div>
          <label htmlFor="saved-draft-markdown" className="mb-2 block font-medium">
            Edit saved draft
          </label>
          <textarea
            id="saved-draft-markdown"
            rows={12}
            className="w-full rounded border p-3 font-mono text-sm"
            value={opened.markdown}
            onChange={(event) => setOpened({ ...opened, markdown: event.target.value })}
          />
          <SaveDraftButton
            key={opened.id}
            draftId={opened.id}
            markdown={opened.markdown}
            onSaved={onSaved}
          />
          <CopyMarkdownButton key={opened.id} markdown={opened.markdown} />
        </div>
      )}
    </section>
  );
}
