import { jsPDF } from "jspdf";

export type ReportPdfInput = {
  title: string;
  addressInput: string;
  formattedAddress: string;
  lgaNameUsed: string;
  treeKindLabel: string;
  councilBullets: string[];
  stateBullets: string[];
  nativeOrNoxiousBullets: string[];
  regulatoryRelationshipNote: string;
  lastUpdatedNote: string;
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
  addParagraph("How council and state rules work together", 13, 6);
  addParagraph(input.regulatoryRelationshipNote, 10, 12);
  addBullets("Council (LGA) regulations (indicative)", input.councilBullets);
  addBullets("Victoria (state) regulations (indicative)", input.stateBullets);
  if (input.nativeOrNoxiousBullets.length) {
    addBullets("Native / noxious nuance (indicative)", input.nativeOrNoxiousBullets);
  }
  addParagraph("Verification", 13, 6);
  addParagraph(input.lastUpdatedNote, 10, 12);
  addParagraph("Disclaimer", 13, 6);
  addParagraph(input.disclaimer, 10);

  const blob = doc.output("blob");
  const buf = await blob.arrayBuffer();
  return arrayBufferToBase64(buf);
}
