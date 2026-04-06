import { jsPDF } from "jspdf";

export type SignificantTreeRegisterPdf = {
  automatedCheckPerformed: boolean;
  dataSource: string | null;
  searchRadiusMeters: number;
  matches: Array<{ summary: string; distanceMeters: number; locationHint?: string }>;
  limitationNote: string;
};

export type CuratedLocalLawPdf = {
  curationStatus: string;
  instrumentLabel: string;
  lastReviewedIso: string;
  primarySourceUrls: string[];
  privateLandSummary: string;
  measurementDescription: string;
  measurementPoints: string[];
  protectedTreeCriteria: string[];
  permitRequiredRemoval: string[];
  permitRequiredPruning: string[];
  exemptions: string[];
  arboristChecks: string[];
  notes: string[];
};

export type ReportPdfInput = {
  title: string;
  addressInput: string;
  formattedAddress: string;
  lgaNameUsed: string;
  treeKindLabel: string;
  curatedLocalLaw: CuratedLocalLawPdf;
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
  significantTreeRegister: SignificantTreeRegisterPdf;
  disclaimer: string;
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function buildReportPdfBase64(input: ReportPdfInput): Promise<string> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;
  const pageH = doc.internal.pageSize.getHeight();
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - margin * 2;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const addParagraph = (text: string, fontSize: number, gap = 8) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxW);
    const lineH = fontSize * 1.25;
    ensureSpace(lines.length * lineH + gap);
    for (const line of lines) {
      doc.text(line, margin, y);
      y += lineH;
    }
    y += gap;
  };

  const addBullets = (title: string, items: string[]) => {
    addParagraph(title, 13, 6);
    for (const item of items) {
      addParagraph(`• ${item}`, 10, 4);
    }
  };

  addParagraph(input.title, 18, 10);
  addParagraph(`Address entered: ${input.addressInput}`, 10);
  addParagraph(`Geocoded: ${input.formattedAddress}`, 10);
  addParagraph(`Council (LGA) used: ${input.lgaNameUsed}`, 10);
  addParagraph(`State: Victoria (VIC)`, 10);
  addParagraph(`Tree: ${input.treeKindLabel}`, 10, 14);
  const cl = input.curatedLocalLaw;
  addParagraph("Council local law (curated reference — verify current law)", 13, 6);
  addParagraph(`Curation: ${cl.curationStatus} — ${cl.instrumentLabel}`, 10);
  addParagraph(`App data reviewed: ${cl.lastReviewedIso}`, 9, 6);
  if (cl.primarySourceUrls.length) {
    addParagraph(`Sources: ${cl.primarySourceUrls.join(" ")}`, 9, 8);
  }
  addParagraph(cl.privateLandSummary, 10, 8);
  addParagraph("Measurement", 12, 4);
  addParagraph(cl.measurementDescription, 10, 4);
  addBullets("Measurement points", cl.measurementPoints);
  addBullets("Protected tree criteria", cl.protectedTreeCriteria);
  addBullets("Permit — removal", cl.permitRequiredRemoval);
  addBullets("Permit — pruning", cl.permitRequiredPruning);
  addBullets("Exemptions (confirm)", cl.exemptions);
  addBullets("Arborist checks", cl.arboristChecks);
  if (cl.notes.length) addBullets("Notes", cl.notes);
  addParagraph("Private land scope (AI summary)", 13, 6);
  addParagraph(input.privateLandScopeNote, 10, 12);
  addBullets("Measure the tree on site (indicative)", input.treeSizeMeasurementBullets);
  addBullets(`${input.lgaNameUsed} — private tree protection (indicative)`, input.lgaPrivateTreeProtectionBullets);
  addBullets("Pruning — often allowed without a permit (indicative)", input.pruneTypicallyAllowedWithoutPermitBullets);
  addBullets("Pruning — usually needs approval (indicative)", input.pruneTypicallyRequiresApprovalBullets);
  addBullets("Removal — sometimes allowed without a tree permit (indicative)", input.removalTypicallyAllowedWithoutPermitBullets);
  addBullets("Removal — usually needs approval (indicative)", input.removalTypicallyRequiresApprovalBullets);
  addBullets("Victoria (state) on private blocks (indicative)", input.statePrivateLandConsiderationsBullets);
  if (input.nativeOrNoxiousBullets.length) {
    addBullets("Native / noxious (indicative)", input.nativeOrNoxiousBullets);
  }
  addParagraph("Council and state together", 13, 6);
  addParagraph(input.regulatoryRelationshipNote, 10, 12);
  const reg = input.significantTreeRegister;
  addParagraph("Significant tree register (private land where data allows)", 13, 6);
  if (reg.automatedCheckPerformed && reg.dataSource) {
    addParagraph(`Data source: ${reg.dataSource}`, 10);
    addParagraph(`Search radius: ${String(reg.searchRadiusMeters)} m around geocoded point`, 10, 8);
    if (reg.matches.length === 0) {
      addParagraph(
        "No private‑land register entries in that radius (not proof that no protection applies).",
        10,
        10,
      );
    } else {
      for (const m of reg.matches) {
        addParagraph(`• ${m.summary} — ~${String(Math.round(m.distanceMeters))} m`, 10, 4);
      }
    }
  } else {
    addParagraph(
      "No automated spatial register query for this council in the app yet, or the query failed. Use the council register and VicPlan.",
      10,
      10,
    );
  }
  addParagraph(reg.limitationNote, 9, 12);
  addParagraph("Verification", 13, 6);
  addParagraph(input.lastUpdatedNote, 10, 12);
  addParagraph("Disclaimer", 13, 6);
  addParagraph(input.disclaimer, 10);

  const blob = doc.output("blob");
  const buf = await blob.arrayBuffer();
  return arrayBufferToBase64(buf);
}
