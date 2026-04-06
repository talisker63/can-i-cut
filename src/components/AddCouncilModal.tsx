import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { VIC_LGA_CANONICAL } from "../data/vic-lga-canonical";
import { getFirebaseFunctions } from "../lib/firebase";
import { buildCuratedEntryFromUrls, parseUrlsFromTextarea, type CurationStatus } from "../lib/add-council-template";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AddCouncilModal({ open, onClose }: Props) {
  const titleId = useId();
  const [lgaName, setLgaName] = useState("");
  const [urlsText, setUrlsText] = useState("");
  const [instrumentLabel, setInstrumentLabel] = useState("");
  const [curationStatus, setCurationStatus] = useState<CurationStatus>("partial");
  const [pasteBlock, setPasteBlock] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [commitBusy, setCommitBusy] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string | null>(null);

  const commitFn = useMemo(() => {
    const fns = getFirebaseFunctions();
    if (!fns) return null;
    return httpsCallable(fns, "canICutAuCommitCuratedCouncil");
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCopied(false);
    setCommitMessage(null);
  }, [open]);

  const generate = useCallback(() => {
    setError(null);
    setCopied(false);
    setPasteBlock("");
    try {
      const urls = parseUrlsFromTextarea(urlsText);
      const { pasteBlock: block } = buildCuratedEntryFromUrls({
        lgaCanonicalName: lgaName,
        primarySourceUrls: urls,
        instrumentLabel: instrumentLabel.trim() || undefined,
        curationStatus,
      });
      setPasteBlock(block);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [lgaName, urlsText, instrumentLabel, curationStatus]);

  const copy = useCallback(async () => {
    if (!pasteBlock) return;
    try {
      await navigator.clipboard.writeText(pasteBlock);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, [pasteBlock]);

  const commit = useCallback(async () => {
    setError(null);
    setCommitMessage(null);
    setCommitBusy(true);
    try {
      if (!commitFn) {
        setError("Firebase is not configured.");
        return;
      }
      const urls = parseUrlsFromTextarea(urlsText);
      await commitFn({
        lgaCanonicalName: lgaName,
        primarySourceUrls: urls,
        instrumentLabel: instrumentLabel.trim() || undefined,
        curationStatus,
      });
      setCommitMessage("Saved. New lookups use this entry (stored in Firestore; overrides static data for this LGA).");
    } catch (e) {
      if (e instanceof FirebaseError && e.code === "functions/permission-denied") {
        setError("Only admin users can save council data.");
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommitBusy(false);
    }
  }, [commitFn, lgaName, urlsText, instrumentLabel, curationStatus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg max-h-[min(90dvh,720px)] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
          <h2 id={titleId} className="text-lg font-semibold text-white">
            Add council (curated template)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-sm text-zinc-400 leading-relaxed">
            <strong className="font-medium text-zinc-200">Commit to live lookup</strong> saves the template to Firestore so regulation checks use it for this LGA.{" "}
            <strong className="font-medium text-zinc-200">Generate paste block</strong> copies the same shape into{" "}
            <code className="text-emerald-400">vic-lga-tree-local-law.ts</code> if you want it in git. Replace TODO lines from the council pages you link.
          </p>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Council (canonical name)</span>
            <select
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-base text-white outline-none focus:border-emerald-500"
              value={lgaName}
              onChange={(e) => setLgaName(e.target.value)}
            >
              <option value="">Select LGA…</option>
              {VIC_LGA_CANONICAL.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs text-zinc-500">
            Names must match <code className="text-zinc-400">vic-councils.ts</code> exactly (same list as this dropdown).
          </p>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Council page URLs (one per line)</span>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm text-zinc-100 outline-none focus:border-emerald-500 font-mono"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder={"https://www.example.vic.gov.au/...&#10;https://..."}
              spellCheck={false}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Instrument label (optional)</span>
            <input
              type="text"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-base text-zinc-100 outline-none focus:border-emerald-500"
              value={instrumentLabel}
              onChange={(e) => setInstrumentLabel(e.target.value)}
              placeholder="e.g. Community Local Law 2024 — Tree Protection"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-zinc-300">Curation status</span>
            <select
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-base text-white outline-none focus:border-emerald-500"
              value={curationStatus}
              onChange={(e) => setCurationStatus(e.target.value as CurationStatus)}
            >
              <option value="partial">partial (default)</option>
              <option value="verified">verified</option>
              <option value="pending">pending</option>
            </select>
          </label>

          {error ? (
            <p className="text-sm text-rose-300 leading-relaxed" role="alert">
              {error}
            </p>
          ) : null}

          {commitMessage ? (
            <p className="text-sm text-emerald-400/90 leading-relaxed" role="status">
              {commitMessage}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => generate()}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white"
            >
              Generate paste block
            </button>
            <button
              type="button"
              onClick={() => void commit()}
              disabled={commitBusy}
              className="w-full rounded-xl border border-emerald-500/60 bg-emerald-950/40 px-4 py-3 text-base font-medium text-emerald-200 hover:bg-emerald-950/70 disabled:opacity-50"
            >
              {commitBusy ? "Saving…" : "Commit to live lookup"}
            </button>
          </div>

          {pasteBlock ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-300">Output</span>
                <button
                  type="button"
                  onClick={() => void copy()}
                  className="rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                className="w-full min-h-[200px] rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-3 text-xs text-zinc-200 font-mono leading-relaxed"
                value={pasteBlock}
                spellCheck={false}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
