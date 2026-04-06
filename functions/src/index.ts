import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { Resend } from "resend";
import { resolveVictorianLga } from "./geo";
import { generateRegulationSummary, type TreeKind } from "./regulations";

const resendApiKey = defineSecret("RESEND_API_KEY");

setGlobalOptions({ region: "us-central1" });

const FIXED_DISCLAIMER =
  "This summary is indicative only and is not legal advice. You must comply with both the named council’s requirements and Victorian state law where they apply; council rules can be stricter or more specific for your site. Verify overlays, heritage, significant trees, permits, and current instruments before works.";

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
    const body = request.data as { address?: unknown; treeKind?: unknown };
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (address.length < 8) {
      throw new HttpsError("invalid-argument", "Enter a full street address including suburb and state.");
    }
    const treeKind = parseTreeKind(body.treeKind);
    const projectId = projectIdOrThrow();
    try {
      const { lgaName, formattedAddress, lat, lng } = await resolveVictorianLga(address);
      const summary = await generateRegulationSummary(projectId, {
        lgaName,
        formattedAddress,
        treeKind,
      });
      return {
        lgaNameUsed: lgaName,
        state: "VIC",
        formattedAddress,
        coordinates: { lat, lng },
        treeKind,
        councilRegulationBullets: summary.councilRegulationBullets,
        stateRegulationBullets: summary.stateRegulationBullets,
        nativeOrNoxiousBullets: summary.nativeOrNoxiousBullets,
        regulatoryRelationshipNote: summary.regulatoryRelationshipNote,
        lastUpdatedNote: summary.lastUpdatedNote,
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

export const canICutAuEmailRegulationReport = onCall(
  { secrets: [resendApiKey], cors: true },
  async (request) => {
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
