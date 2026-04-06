import "./admin-init";
import { defineSecret, defineString } from "firebase-functions/params";
import { getAuth } from "firebase-admin/auth";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { Resend } from "resend";
import { resolveVictorianLga } from "./geo";
import { generateRegulationSummary, type TreeKind } from "./regulations";
import { lookupSignificantTreeRegisterForLga } from "./significant-trees";
import { resolveTreeLocalLawWithFirestore, saveCuratedCouncilEntry } from "./curated-council-firestore";
import { buildCuratedEntryFromUrls } from "./add-council-template";
import { toCuratedLocalLawApi } from "./vic-lga-tree-local-law";

const resendApiKey = defineSecret("RESEND_API_KEY");
const adminEmailsParam = defineString("ADMIN_EMAILS", { default: "" });

setGlobalOptions({ region: "us-central1" });

function adminEmailAllowlist(): Set<string> {
  return new Set(
    adminEmailsParam
      .value()
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function assertSignedIn(request: { auth?: { uid: string; token: Record<string, unknown> } }): void {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const firebase = request.auth.token.firebase as { sign_in_provider?: string } | undefined;
  if (firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("permission-denied", "Anonymous access is not allowed.");
  }
}

function assertAdmin(request: { auth?: { uid: string; token: Record<string, unknown> } }): void {
  assertSignedIn(request);
  if (request.auth!.token.admin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

const FIXED_DISCLAIMER =
  "This summary is indicative only and is not legal advice. It focuses on trees on private land; street and council‑managed trees are generally subject to different controls. You must comply with the named council’s requirements and Victorian state law where they apply. Verify measured tree dimensions against the current local law and planning scheme, plus VicPlan overlays, heritage, registers, and permits before works.";

function parseTreeKind(v: unknown): TreeKind {
  if (v === "native" || v === "non_native" || v === "noxious") return v;
  throw new HttpsError("invalid-argument", "treeKind must be native, non_native, or noxious");
}

function projectIdOrThrow(): string {
  const id = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!id) {
    throw new HttpsError("failed-precondition", "Missing GCLOUD_PROJECT (Vertex AI requires a deployed Cloud Functions environment).");
  }
  return id;
}

export const canICutAuLookupRegulations = onCall(
  { cors: true },
  async (request) => {
    assertSignedIn(request);
    const body = request.data as { address?: unknown; treeKind?: unknown };
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (address.length < 8) {
      throw new HttpsError("invalid-argument", "Enter a full street address including suburb and state.");
    }
    const treeKind = parseTreeKind(body.treeKind);
    const projectId = projectIdOrThrow();
    try {
      const { lgaName, formattedAddress, lat, lng } = await resolveVictorianLga(address);
      const treeLawEntry = await resolveTreeLocalLawWithFirestore(lgaName);
      const curatedLocalLaw = toCuratedLocalLawApi(treeLawEntry);
      const [summary, significantTreeRegister] = await Promise.all([
        generateRegulationSummary(projectId, {
          lgaName,
          formattedAddress,
          treeKind,
          curatedEntry: treeLawEntry,
        }),
        lookupSignificantTreeRegisterForLga(lgaName, lat, lng),
      ]);
      return {
        lgaNameUsed: lgaName,
        state: "VIC",
        formattedAddress,
        coordinates: { lat, lng },
        treeKind,
        curatedLocalLaw,
        privateLandScopeNote: summary.privateLandScopeNote,
        treeSizeMeasurementBullets: summary.treeSizeMeasurementBullets,
        lgaPrivateTreeProtectionBullets: summary.lgaPrivateTreeProtectionBullets,
        pruneTypicallyAllowedWithoutPermitBullets: summary.pruneTypicallyAllowedWithoutPermitBullets,
        pruneTypicallyRequiresApprovalBullets: summary.pruneTypicallyRequiresApprovalBullets,
        removalTypicallyAllowedWithoutPermitBullets: summary.removalTypicallyAllowedWithoutPermitBullets,
        removalTypicallyRequiresApprovalBullets: summary.removalTypicallyRequiresApprovalBullets,
        statePrivateLandConsiderationsBullets: summary.statePrivateLandConsiderationsBullets,
        nativeOrNoxiousBullets: summary.nativeOrNoxiousBullets,
        regulatoryRelationshipNote: summary.regulatoryRelationshipNote,
        lastUpdatedNote: summary.lastUpdatedNote,
        significantTreeRegister,
        disclaimer: FIXED_DISCLAIMER,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Lookup failed";
      if (msg.includes("outside Victoria")) {
        throw new HttpsError("failed-precondition", msg);
      }
      if (msg.includes("Could not determine")) {
        throw new HttpsError("not-found", msg);
      }
      if (msg.includes("Geocoding")) {
        throw new HttpsError("invalid-argument", msg);
      }
      throw new HttpsError("internal", msg);
    }
  },
);

export const canICutAuSyncAdminClaim = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  const email = request.auth.token.email;
  if (!email || typeof email !== "string") {
    throw new HttpsError("failed-precondition", "Your account must have an email address.");
  }
  const isAdmin = adminEmailAllowlist().has(email.toLowerCase());
  await getAuth().setCustomUserClaims(request.auth.uid, { admin: isAdmin });
  return { admin: isAdmin };
});

export const canICutAuCommitCuratedCouncil = onCall({ cors: true }, async (request) => {
  assertAdmin(request);
  const uid = request.auth!.uid;
  const body = request.data as {
    lgaCanonicalName?: unknown;
    primarySourceUrls?: unknown;
    instrumentLabel?: unknown;
    curationStatus?: unknown;
  };
  const lgaCanonicalName = typeof body.lgaCanonicalName === "string" ? body.lgaCanonicalName.trim() : "";
  const urlsRaw = body.primarySourceUrls;
  const primarySourceUrls = Array.isArray(urlsRaw)
    ? urlsRaw.filter((u): u is string => typeof u === "string")
    : [];
  const instrumentLabel =
    typeof body.instrumentLabel === "string" && body.instrumentLabel.trim()
      ? body.instrumentLabel.trim()
      : undefined;
  const curationStatus =
    body.curationStatus === "verified" || body.curationStatus === "partial" || body.curationStatus === "pending"
      ? body.curationStatus
      : undefined;
  if (!lgaCanonicalName) {
    throw new HttpsError("invalid-argument", "lgaCanonicalName is required.");
  }
  try {
    const { row } = buildCuratedEntryFromUrls({
      lgaCanonicalName,
      primarySourceUrls,
      instrumentLabel,
      curationStatus,
    });
    await saveCuratedCouncilEntry(lgaCanonicalName, row, uid);
    return { ok: true as const, lgaCanonicalName };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid council payload";
    throw new HttpsError("invalid-argument", msg);
  }
});

export const canICutAuEmailRegulationReport = onCall(
  { secrets: [resendApiKey], cors: true },
  async (request) => {
    assertSignedIn(request);
    const body = request.data as {
      to?: unknown;
      subject?: unknown;
      html?: unknown;
      pdfBase64?: unknown;
      pdfFilename?: unknown;
    };
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const html = typeof body.html === "string" ? body.html : "";
    if (!to || !subject || !html) {
      throw new HttpsError("invalid-argument", "to, subject, and html are required");
    }
    const pdfBase64 = typeof body.pdfBase64 === "string" ? body.pdfBase64.trim() : "";
    const pdfFilename =
      typeof body.pdfFilename === "string" && body.pdfFilename.trim()
        ? body.pdfFilename.trim()
        : "can-i-cut-report.pdf";
    const resend = new Resend(resendApiKey.value());
    const attachments = pdfBase64
      ? [
          {
            filename: pdfFilename,
            content: Buffer.from(pdfBase64, "base64"),
          },
        ]
      : undefined;
    const { error } = await resend.emails.send({
      from: "andrew@asleight.com",
      to,
      subject,
      html,
      attachments,
    });
    if (error) {
      throw new HttpsError("internal", error.message);
    }
    return { ok: true };
  },
);

export const canICutAuSendTransactionalEmail = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required");
    }
    const body = request.data as { to?: string; subject?: string; html?: string };
    const to = typeof body.to === "string" ? body.to : "";
    const subject = typeof body.subject === "string" ? body.subject : "";
    const html = typeof body.html === "string" ? body.html : "";
    if (!to || !subject || !html) {
      throw new HttpsError("invalid-argument", "to, subject, and html are required");
    }
    const resend = new Resend(resendApiKey.value());
    const { error } = await resend.emails.send({
      from: "andrew@asleight.com",
      to,
      subject,
      html,
    });
    if (error) {
      throw new HttpsError("internal", error.message);
    }
    return { ok: true };
  },
);
