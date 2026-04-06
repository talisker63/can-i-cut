import { useCallback, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { getFirebaseApp, getFirebaseFunctions } from "./lib/firebase";
import { buildReportPdfBase64, type ReportPdfInput } from "./lib/pdf";
import { useAuth } from "./hooks/useAuth";

type TreeKind = "native" | "non_native" | "noxious";

type LookupResult = {
  lgaNameUsed: string;
  state: string;
  formattedAddress: string;
  treeKind: TreeKind;
  councilRegulationBullets: string[];
  stateRegulationBullets: string[];
  nativeOrNoxiousBullets: string[];
  regulatoryRelationshipNote: string;
  lastUpdatedNote: string;
  disclaimer: string;
};

function treeKindLabel(kind: TreeKind): string {
  if (kind === "native") return "Native";
  if (kind === "noxious") return "Noxious weed";
  return "Non-native";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(input: {
  address: string;
  result: LookupResult;
}): string {
  const r = input.result;
  const lines = (title: string, items: string[]) =>
    `<h2 style="font-size:16px;margin:16px 0 8px;">${escapeHtml(title)}</h2><ul style="margin:0;padding-left:20px;">${items
      .map((b) => `<li style="margin:6px 0;">${escapeHtml(b)}</li>`)
      .join("")}</ul>`;
  const extra =
    r.nativeOrNoxiousBullets.length > 0
      ? lines("Native / noxious nuance (indicative)", r.nativeOrNoxiousBullets)
      : "";
  return `<div style="font-family:system-ui,sans-serif;line-height:1.45;color:#111;">
  <p><strong>Can I cut it?</strong> — indicative summary only</p>
  <p><strong>Address entered:</strong> ${escapeHtml(input.address)}</p>
  <p><strong>Geocoded:</strong> ${escapeHtml(r.formattedAddress)}</p>
  <p><strong>Council (LGA):</strong> ${escapeHtml(r.lgaNameUsed)}</p>
  <p><strong>State:</strong> ${escapeHtml(r.state)}</p>
  <p><strong>Tree:</strong> ${escapeHtml(treeKindLabel(r.treeKind))}</p>
  <h2 style="font-size:16px;margin:16px 0 8px;">How council and state rules work together</h2>
  <p style="margin:0 0 12px;">${escapeHtml(r.regulatoryRelationshipNote)}</p>
  ${lines("Council (LGA) regulations (indicative)", r.councilRegulationBullets)}
  ${lines("Victoria (state) regulations (indicative)", r.stateRegulationBullets)}
  ${extra}
  <h2 style="font-size:16px;margin:16px 0 8px;">Verification</h2>
  <p style="margin:0 0 12px;">${escapeHtml(r.lastUpdatedNote)}</p>
  <h2 style="font-size:16px;margin:16px 0 8px;">Disclaimer</h2>
  <p style="margin:0;">${escapeHtml(r.disclaimer)}</p>
</div>`;
}

function errorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    return err.message || err.code;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export default function App() {
  const { ready } = useAuth();
  const firebaseOk = Boolean(getFirebaseApp());
  const [address, setAddress] = useState("");
  const [treeKind, setTreeKind] = useState<TreeKind>("non_native");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);

  const lookupFn = useMemo(() => {
    const fns = getFirebaseFunctions();
    if (!fns) return null;
    return httpsCallable(fns, "canICutAuLookupRegulations");
  }, []);

  const emailFn = useMemo(() => {
    const fns = getFirebaseFunctions();
    if (!fns) return null;
    return httpsCallable(fns, "canICutAuEmailRegulationReport");
  }, []);

  const runLookup = useCallback(async () => {
    setError(null);
    setEmailNote(null);
    setResult(null);
    if (!lookupFn) {
      setError("Firebase is not configured.");
      return;
    }
    const trimmed = address.trim();
    if (trimmed.length < 8) {
      setError("Enter a full street address including suburb and state.");
      return;
    }
    setLoading(true);
    try {
      const res = await lookupFn({ address: trimmed, treeKind });
      const data = res.data as LookupResult;
      setResult(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [address, lookupFn, treeKind]);

  const downloadPdf = useCallback(async () => {
    if (!result) return;
    const input: ReportPdfInput = {
      title: "Can I cut it? — regulations summary",
      addressInput: address.trim(),
      formattedAddress: result.formattedAddress,
      lgaNameUsed: result.lgaNameUsed,
      treeKindLabel: treeKindLabel(result.treeKind),
      councilBullets: result.councilRegulationBullets,
      stateBullets: result.stateRegulationBullets,
      nativeOrNoxiousBullets: result.nativeOrNoxiousBullets,
      regulatoryRelationshipNote: result.regulatoryRelationshipNote,
      lastUpdatedNote: result.lastUpdatedNote,
      disclaimer: result.disclaimer,
    };
    const b64 = await buildReportPdfBase64(input);
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "can-i-cut-report.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }, [address, result]);

  const sendEmail = useCallback(async () => {
    setEmailNote(null);
    if (!result || !emailFn) {
      setEmailNote("Run a lookup first.");
      return;
    }
    const to = emailTo.trim();
    if (!to) {
      setEmailNote("Enter an email address.");
      return;
    }
    setEmailBusy(true);
    try {
      const input: ReportPdfInput = {
        title: "Can I cut it? — regulations summary",
        addressInput: address.trim(),
        formattedAddress: result.formattedAddress,
        lgaNameUsed: result.lgaNameUsed,
        treeKindLabel: treeKindLabel(result.treeKind),
        councilBullets: result.councilRegulationBullets,
        stateBullets: result.stateRegulationBullets,
        nativeOrNoxiousBullets: result.nativeOrNoxiousBullets,
        regulatoryRelationshipNote: result.regulatoryRelationshipNote,
        lastUpdatedNote: result.lastUpdatedNote,
        disclaimer: result.disclaimer,
      };
      const pdfBase64 = await buildReportPdfBase64(input);
      const html = buildEmailHtml({ address: address.trim(), result });
      await emailFn({
        to,
        subject: "Can I cut it? — regulations summary",
        html,
        pdfBase64,
        pdfFilename: "can-i-cut-report.pdf",
      });
      setEmailNote("Sent.");
    } catch (e) {
      setEmailNote(errorMessage(e));
    } finally {
      setEmailBusy(false);
    }
  }, [address, emailFn, emailTo, result]);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <p className="text-zinc-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-lg px-4 py-8 pb-16">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Can I cut it?</h1>
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Victorian council (LGA) and state rules for pruning or removing trees — indicative summary only.
          </p>
        </header>

        {!firebaseOk ? (
          <p className="text-amber-300 text-sm leading-relaxed">
            Firebase is not configured. Copy <code className="text-emerald-400">.env.example</code> to{" "}
            <code className="text-emerald-400">.env</code> and add your Firebase web config.
          </p>
        ) : (
          <>
            <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <label className="block space-y-2">
                <span className="text-sm text-zinc-300">Street address</span>
                <input
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base outline-none focus:border-emerald-500"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 123 Collins St, Melbourne VIC 3000"
                  autoComplete="street-address"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-zinc-300">Tree type</span>
                <select
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base outline-none focus:border-emerald-500"
                  value={treeKind}
                  onChange={(e) => setTreeKind(e.target.value as TreeKind)}
                >
                  <option value="native">Native</option>
                  <option value="non_native">Non-native</option>
                  <option value="noxious">Noxious weed</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => void runLookup()}
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
              >
                {loading ? "Checking…" : "Check regulations"}
              </button>
            </section>

            {error ? (
              <p className="mt-4 text-sm text-rose-300 leading-relaxed" role="alert">
                {error}
              </p>
            ) : null}

            {result ? (
              <section className="mt-8 space-y-6">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                  <p className="text-sm text-zinc-400">Council used for local rules</p>
                  <p className="text-lg font-medium text-white">{result.lgaNameUsed}</p>
                  <p className="text-sm text-zinc-400">Geocoded</p>
                  <p className="text-sm text-zinc-200 leading-relaxed">{result.formattedAddress}</p>
                  <p className="text-sm text-zinc-400 pt-2">Tree</p>
                  <p className="text-sm text-zinc-200">{treeKindLabel(result.treeKind)}</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-zinc-200 mb-2">Council and state</h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.regulatoryRelationshipNote}</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">Council (LGA) regulations</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.councilRegulationBullets.map((b, i) => (
                      <li key={`c-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">Victoria (state) regulations</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.stateRegulationBullets.map((b, i) => (
                      <li key={`s-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                {result.nativeOrNoxiousBullets.length ? (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <h2 className="text-sm font-semibold text-emerald-400 mb-3">Native / noxious nuance</h2>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                      {result.nativeOrNoxiousBullets.map((b, i) => (
                        <li key={`n-${i}`}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-zinc-200 mb-2">Verify before works</h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.lastUpdatedNote}</p>
                </div>

                <div className="rounded-2xl border border-amber-900/50 bg-amber-950/20 p-4">
                  <h2 className="text-sm font-semibold text-amber-200 mb-2">Disclaimer</h2>
                  <p className="text-sm text-amber-100/90 leading-relaxed">{result.disclaimer}</p>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => void downloadPdf()}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base font-medium text-white"
                  >
                    Download PDF
                  </button>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                    <label className="block space-y-2">
                      <span className="text-sm text-zinc-300">Email the report</span>
                      <input
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-base outline-none focus:border-emerald-500"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        inputMode="email"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void sendEmail()}
                      disabled={emailBusy}
                      className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-base font-medium text-zinc-950 disabled:opacity-50"
                    >
                      {emailBusy ? "Sending…" : "Email report"}
                    </button>
                    {emailNote ? <p className="text-sm text-zinc-400">{emailNote}</p> : null}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
