"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  setDoc,
} from "firebase/firestore/lite";
import { firebaseApp } from "../firebase";
import { MarkdownEditor } from "./markdown-editor";
import { ReportExport } from "./report-export";
import { reportTitle } from "./report-markdown";

type SavedDraft = {
  id: string;
  title: string;
  markdown: string;
  updatedAt: Date | null;
};

const updatedAtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

function subscribeToConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function isOnline() {
  return navigator.onLine;
}

export function useOnline() {
  return useSyncExternalStore(subscribeToConnectivity, isOnline, () => true);
}

let pendingDraftSession: Promise<string> | undefined;

function getDraftUid(): Promise<string> {
  pendingDraftSession ??= (async () => {
    const auth = getAuth(firebaseApp);
    await auth.authStateReady();
    if (!isOnline()) {
      throw new Error("Draft authentication interrupted by offline mode.");
    }
    return (auth.currentUser ?? (await signInAnonymously(auth)).user).uid;
  })().finally(() => {
    pendingDraftSession = undefined;
  });

  return pendingDraftSession;
}

function draftsCollection(uid: string) {
  return collection(getFirestore(firebaseApp), "users", uid, "drafts");
}

export function SaveDraftButton({
  markdown,
  onSaved,
  draftId,
}: {
  markdown: string;
  onSaved: (markdown: string) => void;
  draftId?: string;
}) {
  const online = useOnline();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedMarkdown, setSavedMarkdown] = useState<string>();
  const saving = useRef(false);
  const newDraftId = useRef<string | undefined>(undefined);

  async function save() {
    if (!isOnline() || saving.current || !markdown.trim()) {
      return;
    }

    saving.current = true;
    setStatus("saving");
    try {
      const uid = await getDraftUid();
      if (!isOnline()) {
        setStatus("error");
        return;
      }
      const drafts = draftsCollection(uid);
      const id = draftId ?? newDraftId.current;
      const reference = id === undefined ? doc(drafts) : doc(drafts, id);
      if (draftId === undefined) {
        newDraftId.current = reference.id;
      }
      await setDoc(reference, {
        title: reportTitle(markdown),
        markdown,
        updatedAt: serverTimestamp(),
      });
      setSavedMarkdown(markdown);
      setStatus("saved");
      onSaved(markdown);
    } catch {
      setStatus("error");
    } finally {
      saving.current = false;
    }
  }

  return (
    <div className="action-item">
      <button
        type="button"
        disabled={!online || status === "saving" || !markdown.trim()}
        onClick={save}
      >
        {status === "saving" ? "Saving…" : "Save draft"}
      </button>
      {status === "saved" && (
        <p className={markdown === savedMarkdown ? "save-confirmation" : "save-pending"} role="status">
          {markdown === savedMarkdown ? "Draft saved." : "Draft saved. Newer edits are unsaved."}
        </p>
      )}
      {online && status === "error" && (
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
  const online = useOnline();
  const [list, setList] = useState<{ version: number; drafts?: SavedDraft[]; failed: boolean }>();
  const [retry, setRetry] = useState(0);
  const [opened, setOpened] = useState<SavedDraft | null>(null);
  const [titleFilter, setTitleFilter] = useState("");
  const currentList = list?.drafts;
  const loadFailed = online && list?.version === refreshVersion + retry && list.failed;
  const matchingDrafts = currentList?.filter((draft) =>
    draft.title.toLocaleLowerCase().includes(titleFilter.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    if (!online || !isOnline()) return;

    let active = true;
    const version = refreshVersion + retry;

    async function loadDrafts() {
      try {
        const uid = await getDraftUid();
        if (!active || !isOnline()) return;

        const snapshot = await getDocs(query(draftsCollection(uid), orderBy("updatedAt", "desc")));
        if (active && isOnline()) {
          setList({
            version,
            failed: false,
            drafts: snapshot.docs.map((draft) => {
              const { title, markdown, updatedAt } = draft.data();
              return {
                id: draft.id,
                title,
                markdown,
                updatedAt: updatedAt instanceof Timestamp ? updatedAt.toDate() : null,
              };
            }),
          });
        }
      } catch {
        if (active && isOnline()) {
          setList((previous) => ({ version, drafts: previous?.drafts, failed: true }));
        }
      }
    }

    void loadDrafts();
    return () => { active = false; };
  }, [online, refreshVersion, retry]);

  return (
    <section className="panel" aria-labelledby="saved-drafts-heading">
      <div className="panel-header">
        <h2 id="saved-drafts-heading" tabIndex={-1}>Saved drafts</h2>
        <input type="search" aria-label="Filter drafts by title" placeholder="Filter by title"
          value={titleFilter} onChange={(event) => setTitleFilter(event.target.value)} />
      </div>
      <div className="panel-body flow">
        {!online && <p className="muted" role="status">Offline. Reconnect to load or save drafts.</p>}
        {online && !loadFailed && currentList === undefined && <p className="muted" role="status">Loading saved drafts…</p>}
        {loadFailed && (
          <div className="flow compact">
            <p role="alert">Could not load saved drafts. Check your connection and Firebase setup.</p>
            <button type="button" onClick={() => setRetry((count) => count + 1)}>Retry</button>
          </div>
        )}
        {currentList?.length === 0 && <p className="muted">No saved drafts yet.</p>}
        {!!currentList?.length && matchingDrafts?.length === 0 && <p role="status">No drafts match that title.</p>}
        {!!matchingDrafts?.length && (
          <ul className="draft-list" tabIndex={0} aria-label="Saved draft list">
            {matchingDrafts.map((draft) => (
              <li key={draft.id}>
                <button type="button" aria-pressed={opened?.id === draft.id}
                  onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" })}
                  onClick={() => {
                    if (opened?.id !== draft.id) setOpened(draft);
                  }}>
                  <span className="saved-title">{draft.title}</span>
                  {opened?.id === draft.id && <span className="selected-draft">Selected</span>}
                  {draft.updatedAt && (
                    <time dateTime={draft.updatedAt.toISOString()}>
                      Updated {updatedAtFormat.format(draft.updatedAt)}
                    </time>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {opened !== null && (
          <div className="saved-draft-editor">
            <MarkdownEditor key={opened.id} id="saved-draft-markdown" label="Edit saved draft" markdown={opened.markdown}
              onChange={(markdown) => setOpened({ ...opened, markdown })} actions={(
                <div className="actions editor-actions">
                  <SaveDraftButton draftId={opened.id} markdown={opened.markdown} onSaved={onSaved} />
                  <ReportExport markdown={opened.markdown} />
                </div>
              )} />
          </div>
        )}
      </div>
    </section>
  );
}
