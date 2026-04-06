import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseError } from "firebase/app";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { getFirebaseApp, getFirebaseAuth, getFirebaseFunctions } from "./lib/firebase";
import { buildReportPdfBase64, type CuratedLocalLawPdf, type ReportPdfInput } from "./lib/pdf";
import { useAuth } from "./hooks/useAuth";
import { AddCouncilModal } from "./components/AddCouncilModal";
import { AuthScreen } from "./components/AuthScreen";
import { HelpModal } from "./components/HelpModal";

type TreeKind = "native" | "non_native" | "noxious";

type SignificantTreeRegisterResult = {
  automatedCheckPerformed: boolean;
  council: string;
  dataSource: string | null;
  searchRadiusMeters: number;
  matches: Array<{ summary: string; distanceMeters: number; locationHint?: string }>;
  limitationNote: string;
};

type CuratedLocalLawResult = CuratedLocalLawPdf;

type LookupResult = {
  lgaNameUsed: string;
  state: string;
  formattedAddress: string;
  treeKind: TreeKind;
  curatedLocalLaw: CuratedLocalLawResult;
  privateLandScopeNote: string;
  treeSizeMeasurementBullets: string[];
  lgaPrivateTreeProtectionBullets: string[];
  pruneTypicallyAllowedWithoutPermitBullets: string[];
  pruneTypicallyRequiresApprovalBullets: string[];
  removalTypicallyAllowedWithoutPermitBullets: string[];
  removalTypicallyRequiresApprovalBullets: string[];
  statePrivateLandConsiderationsBullets: string[];
  nativeOrNoxiousBullets: string[];
  regulatoryRelationshipNote: string;
  lastUpdatedNote: string;
  significantTreeRegister: SignificantTreeRegisterResult;
  disclaimer: string;
};

function treeKindLabel(kind: TreeKind): string {
  if (kind === "native") return "Native";
  if (kind === "noxious") return "Noxious weed";
  return "Non-native";
}

function curationStatusStyle(status: string): string {
  if (status === "verified") return "text-emerald-400";
  if (status === "partial") return "text-amber-300";
  return "text-zinc-500";
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
  const str = r.significantTreeRegister;
  const strHtml =
    str.automatedCheckPerformed && str.dataSource
      ? `<h2 style="font-size:16px;margin:16px 0 8px;">Significant tree register (private land where data allows)</h2>
  <p style="margin:0 0 8px;"><strong>Source:</strong> ${escapeHtml(str.dataSource)}</p>
  <p style="margin:0 0 8px;"><strong>Radius:</strong> ${escapeHtml(String(str.searchRadiusMeters))} m</p>
  ${
    str.matches.length === 0
      ? `<p style="margin:0 0 12px;">No private-land register entries in that radius (not proof of no protected tree).</p>`
      : `<ul style="margin:0;padding-left:20px;">${str.matches
          .map(
            (m) =>
              `<li style="margin:6px 0;">${escapeHtml(m.summary)} — ~${escapeHtml(String(Math.round(m.distanceMeters)))} m</li>`,
          )
          .join("")}</ul>`
  }
  <p style="margin:12px 0 0;">${escapeHtml(str.limitationNote)}</p>`
      : `<h2 style="font-size:16px;margin:16px 0 8px;">Significant tree register</h2>
  <p style="margin:0 0 12px;">No automated query for this council in the app, or the lookup failed. ${escapeHtml(str.limitationNote)}</p>`;
  return `<div style="font-family:system-ui,sans-serif;line-height:1.45;color:#111;">
  <p><strong>Can I cut it?</strong> — private land trees, indicative only</p>
  <p><strong>Address entered:</strong> ${escapeHtml(input.address)}</p>
  <p><strong>Geocoded:</strong> ${escapeHtml(r.formattedAddress)}</p>
  <p><strong>Council (LGA):</strong> ${escapeHtml(r.lgaNameUsed)}</p>
  <p><strong>State:</strong> ${escapeHtml(r.state)}</p>
  <p><strong>Tree:</strong> ${escapeHtml(treeKindLabel(r.treeKind))}</p>
  <h2 style="font-size:16px;margin:16px 0 8px;">Council local law (curated reference)</h2>
  <p style="margin:0 0 8px;"><strong>Status:</strong> ${escapeHtml(r.curatedLocalLaw.curationStatus)} — ${escapeHtml(r.curatedLocalLaw.instrumentLabel)}</p>
  <p style="margin:0 0 8px;"><strong>App data reviewed:</strong> ${escapeHtml(r.curatedLocalLaw.lastReviewedIso)}</p>
  ${r.curatedLocalLaw.primarySourceUrls.map((u) => `<p style="margin:4px 0;"><a href="${escapeHtml(u)}">${escapeHtml(u)}</a></p>`).join("")}
  <p style="margin:8px 0;">${escapeHtml(r.curatedLocalLaw.privateLandSummary)}</p>
  ${lines("Measurement points", r.curatedLocalLaw.measurementPoints)}
  ${lines("Permit — removal", r.curatedLocalLaw.permitRequiredRemoval)}
  ${lines("Permit — pruning", r.curatedLocalLaw.permitRequiredPruning)}
  ${lines("Exemptions (confirm)", r.curatedLocalLaw.exemptions)}
  <h2 style="font-size:16px;margin:16px 0 8px;">Private land scope (AI summary)</h2>
  <p style="margin:0 0 12px;">${escapeHtml(r.privateLandScopeNote)}</p>
  ${lines("Measure the tree on site (indicative)", r.treeSizeMeasurementBullets)}
  ${lines(`${r.lgaNameUsed} — private tree protection (indicative)`, r.lgaPrivateTreeProtectionBullets)}
  ${lines("Pruning — often allowed without a permit (indicative)", r.pruneTypicallyAllowedWithoutPermitBullets)}
  ${lines("Pruning — usually needs approval (indicative)", r.pruneTypicallyRequiresApprovalBullets)}
  ${lines("Removal — sometimes allowed without a tree permit (indicative)", r.removalTypicallyAllowedWithoutPermitBullets)}
  ${lines("Removal — usually needs approval (indicative)", r.removalTypicallyRequiresApprovalBullets)}
  ${lines("Victoria (state) on private blocks (indicative)", r.statePrivateLandConsiderationsBullets)}
  ${strHtml}
  <h2 style="font-size:16px;margin:16px 0 8px;">How council and state rules work together</h2>
  <p style="margin:0 0 12px;">${escapeHtml(r.regulatoryRelationshipNote)}</p>
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
  const { ready, user, isAdmin } = useAuth();
  const firebaseOk = Boolean(getFirebaseApp());
  const [address, setAddress] = useState("");
  const [treeKind, setTreeKind] = useState<TreeKind>("non_native");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [addCouncilOpen, setAddCouncilOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) setAddCouncilOpen(false);
  }, [isAdmin]);

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
      title: "Can I cut it? — private land trees",
      addressInput: address.trim(),
      formattedAddress: result.formattedAddress,
      lgaNameUsed: result.lgaNameUsed,
      treeKindLabel: treeKindLabel(result.treeKind),
      curatedLocalLaw: result.curatedLocalLaw,
      privateLandScopeNote: result.privateLandScopeNote,
      treeSizeMeasurementBullets: result.treeSizeMeasurementBullets,
      lgaPrivateTreeProtectionBullets: result.lgaPrivateTreeProtectionBullets,
      pruneTypicallyAllowedWithoutPermitBullets: result.pruneTypicallyAllowedWithoutPermitBullets,
      pruneTypicallyRequiresApprovalBullets: result.pruneTypicallyRequiresApprovalBullets,
      removalTypicallyAllowedWithoutPermitBullets: result.removalTypicallyAllowedWithoutPermitBullets,
      removalTypicallyRequiresApprovalBullets: result.removalTypicallyRequiresApprovalBullets,
      statePrivateLandConsiderationsBullets: result.statePrivateLandConsiderationsBullets,
      nativeOrNoxiousBullets: result.nativeOrNoxiousBullets,
      regulatoryRelationshipNote: result.regulatoryRelationshipNote,
      lastUpdatedNote: result.lastUpdatedNote,
      significantTreeRegister: result.significantTreeRegister,
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
        title: "Can I cut it? — private land trees",
        addressInput: address.trim(),
        formattedAddress: result.formattedAddress,
        lgaNameUsed: result.lgaNameUsed,
        treeKindLabel: treeKindLabel(result.treeKind),
        curatedLocalLaw: result.curatedLocalLaw,
        privateLandScopeNote: result.privateLandScopeNote,
        treeSizeMeasurementBullets: result.treeSizeMeasurementBullets,
        lgaPrivateTreeProtectionBullets: result.lgaPrivateTreeProtectionBullets,
        pruneTypicallyAllowedWithoutPermitBullets: result.pruneTypicallyAllowedWithoutPermitBullets,
        pruneTypicallyRequiresApprovalBullets: result.pruneTypicallyRequiresApprovalBullets,
        removalTypicallyAllowedWithoutPermitBullets: result.removalTypicallyAllowedWithoutPermitBullets,
        removalTypicallyRequiresApprovalBullets: result.removalTypicallyRequiresApprovalBullets,
        statePrivateLandConsiderationsBullets: result.statePrivateLandConsiderationsBullets,
        nativeOrNoxiousBullets: result.nativeOrNoxiousBullets,
        regulatoryRelationshipNote: result.regulatoryRelationshipNote,
        lastUpdatedNote: result.lastUpdatedNote,
        significantTreeRegister: result.significantTreeRegister,
        disclaimer: result.disclaimer,
      };
      const pdfBase64 = await buildReportPdfBase64(input);
      const html = buildEmailHtml({ address: address.trim(), result });
      await emailFn({
        to,
        subject: "Can I cut it? — private land trees",
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

  const signOutUser = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (auth) await signOut(auth);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <p className="text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (!firebaseOk) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <p className="text-amber-300 text-sm leading-relaxed max-w-md text-center">
          Firebase is not configured. Copy <code className="text-emerald-400">.env.example</code> to{" "}
          <code className="text-emerald-400">.env</code> and add your Firebase web config.
        </p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-lg px-4 py-8 pb-16">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">Can I cut it?</h1>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Private land trees in Victoria: measure size, then see what pruning or removal may be allowed — indicative only, not legal advice.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="text-xs text-zinc-500 truncate max-w-[14rem]" title={user.email ?? undefined}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Sign out
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start sm:self-end">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="Help"
                title="Help"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-600 bg-zinc-900 text-lg font-semibold leading-none text-zinc-200 hover:bg-zinc-800 hover:text-white"
              >
                ?
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => setAddCouncilOpen(true)}
                  className="rounded-xl border border-zinc-600 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 hover:text-white"
                >
                  Add council
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        <AddCouncilModal open={addCouncilOpen && isAdmin} onClose={() => setAddCouncilOpen(false)} />

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

                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold text-zinc-100">Council local law (curated)</h2>
                    <span className={`text-xs font-medium uppercase tracking-wide ${curationStatusStyle(result.curatedLocalLaw.curationStatus)}`}>
                      {result.curatedLocalLaw.curationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{result.curatedLocalLaw.instrumentLabel}</p>
                  <p className="text-xs text-zinc-500">App data reviewed: {result.curatedLocalLaw.lastReviewedIso}</p>
                  {result.curatedLocalLaw.primarySourceUrls.length ? (
                    <ul className="text-xs space-y-1">
                      {result.curatedLocalLaw.primarySourceUrls.map((u) => (
                        <li key={u}>
                          <a href={u} className="text-emerald-400/90 underline break-all" target="_blank" rel="noreferrer">
                            {u}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.curatedLocalLaw.privateLandSummary}</p>
                  <div>
                    <h3 className="text-xs font-semibold text-zinc-400 mb-2">How to measure</h3>
                    <p className="text-sm text-zinc-400 mb-2">{result.curatedLocalLaw.measurementDescription}</p>
                    <ul className="list-disc pl-5 space-y-1.5 text-sm text-zinc-200 leading-relaxed">
                      {result.curatedLocalLaw.measurementPoints.map((b, i) => (
                        <li key={`m-${i}`}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <h3 className="text-xs font-semibold text-rose-300/90 mb-1.5">Permit — removal</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
                        {result.curatedLocalLaw.permitRequiredRemoval.map((b, i) => (
                          <li key={`r-${i}`}>{b}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-rose-300/90 mb-1.5">Permit — pruning</h3>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-200">
                        {result.curatedLocalLaw.permitRequiredPruning.map((b, i) => (
                          <li key={`p-${i}`}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-zinc-200 mb-2">Private land scope</h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.privateLandScopeNote}</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">Measure the tree (size check)</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.treeSizeMeasurementBullets.map((b, i) => (
                      <li key={`sz-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">
                    {result.lgaNameUsed} — private tree protection
                  </h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.lgaPrivateTreeProtectionBullets.map((b, i) => (
                      <li key={`lg-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">Pruning — often OK without a permit</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.pruneTypicallyAllowedWithoutPermitBullets.map((b, i) => (
                      <li key={`pa-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-amber-400/90 mb-3">Pruning — usually needs approval</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.pruneTypicallyRequiresApprovalBullets.map((b, i) => (
                      <li key={`pr-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">Removal — sometimes OK without a tree permit</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.removalTypicallyAllowedWithoutPermitBullets.map((b, i) => (
                      <li key={`ra-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-amber-400/90 mb-3">Removal — usually needs approval</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.removalTypicallyRequiresApprovalBullets.map((b, i) => (
                      <li key={`rm-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">Victoria (state) on private blocks</h2>
                  <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                    {result.statePrivateLandConsiderationsBullets.map((b, i) => (
                      <li key={`st-${i}`}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-emerald-400 mb-3">Significant tree register (private land where data allows)</h2>
                  {result.significantTreeRegister.automatedCheckPerformed && result.significantTreeRegister.dataSource ? (
                    <>
                      <p className="text-xs text-zinc-500 mb-2">{result.significantTreeRegister.dataSource}</p>
                      <p className="text-sm text-zinc-400 mb-3">
                        Radius {result.significantTreeRegister.searchRadiusMeters} m from geocoded point.
                      </p>
                      {result.significantTreeRegister.matches.length === 0 ? (
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          No private-land register entries in that radius. That does not prove no tree protection applies — confirm on-site and with the council.
                        </p>
                      ) : (
                        <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
                          {result.significantTreeRegister.matches.map((m, i) => (
                            <li key={`st-${i}`}>
                              {m.summary}
                              <span className="text-zinc-500"> — ~{Math.round(m.distanceMeters)} m</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      No automated register query for this council in the app yet, or the lookup failed. Use the council’s tree or planning pages and VicPlan for this address.
                    </p>
                  )}
                  <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{result.significantTreeRegister.limitationNote}</p>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <h2 className="text-sm font-semibold text-zinc-200 mb-2">Council and state</h2>
                  <p className="text-sm text-zinc-300 leading-relaxed">{result.regulatoryRelationshipNote}</p>
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
      </div>
    </div>
  );
}
