import { VIC_LGA_CANONICAL } from "./vic-councils";
import type { CurationStatus, VicLgaCuratedRow } from "./vic-lga-tree-local-law";

const CANONICAL_SET = new Set<string>(VIC_LGA_CANONICAL as unknown as string[]);

export function isCanonicalLgaName(name: string): boolean {
  return CANONICAL_SET.has(name.trim());
}

export function suggestCanonicalLgaNames(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...VIC_LGA_CANONICAL].slice(0, 12);
  return (VIC_LGA_CANONICAL as readonly string[]).filter((n) => n.toLowerCase().includes(q)).slice(0, 16);
}

export function assertCanonicalLgaName(name: string): void {
  const t = name.trim();
  if (!CANONICAL_SET.has(t)) {
    const sug = suggestCanonicalLgaNames(t).slice(0, 8);
    const hint = sug.length ? ` Try: ${sug.join(", ")}` : "";
    throw new Error(
      `Not a canonical Victorian LGA name: "${name}". Names must match vic-councils.ts exactly (e.g. "Merri-bek", "Greater Geelong").${hint}`,
    );
  }
}

export function normalizePrimarySourceUrls(urls: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    let u = raw.trim();
    if (!u) continue;
    if (!/^https?:\/\//i.test(u)) {
      u = `https://${u}`;
    }
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error(`Unsupported protocol: ${parsed.protocol}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Invalid URL "${raw}": ${msg}`);
    }
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  if (out.length === 0) {
    throw new Error("Provide at least one http(s) URL.");
  }
  return out;
}

export type CreateCuratedRowTemplateInput = {
  primarySourceUrls: string[];
  instrumentLabel?: string;
  curationStatus?: CurationStatus;
  councilLabel?: string;
};

export function createCuratedRowTemplate(input: CreateCuratedRowTemplateInput): VicLgaCuratedRow {
  const primarySourceUrls = normalizePrimarySourceUrls(input.primarySourceUrls);
  const today = new Date().toISOString().slice(0, 10);
  const council = input.councilLabel?.trim() || "This council";
  const status: CurationStatus = input.curationStatus ?? "partial";
  const instrumentLabel =
    input.instrumentLabel?.trim() ||
    "Community / General Local Law or Planning Scheme — replace with official instrument title after you read the sources";

  return {
    curationStatus: status,
    instrumentLabel,
    lastReviewedIso: today,
    primarySourceUrls,
    privateLandSummary: `${council} controls works to trees on private land through its local law and/or the planning scheme (e.g. Clause 52.37 canopy trees, overlays). Replace this paragraph with a short summary from the sources you pasted.`,
    measurement: {
      description:
        "Extract the exact measurement point (ground level, 1.2 m, 1.3 m, 1.4 m, 1.5 m), whether circumference or diameter, and multi-stem rules from the council’s current PDF.",
      points: [
        "TODO: Insert protected-tree size tests (e.g. minimum trunk circumference or DBH) from the local law or planning scheme schedule.",
        "TODO: Note any height, canopy spread, or boundary-distance tests (common in Clause 52.37 residential schedules).",
        "TODO: If the scheme uses ‘canopy tree’, copy the definition verbatim into app notes after verification.",
      ],
    },
    protectedTreeCriteria: [
      "TODO: List when a private tree is protected (size tests, register listing, overlay).",
    ],
    permitRequired: {
      removal: ["TODO: When removal requires a local law permit, planning permit, or both."],
      pruning: ["TODO: When pruning or works within TPZ/root zone require approval."],
    },
    exemptions: [
      "TODO: Exemptions for minor pruning, dead trees, weeds, emergencies — from current instrument.",
    ],
    arboristChecks: [
      "TODO: What to record on site (photos, DBH method, canopy %) for permit applications.",
    ],
    notes: [
      "Replace all TODO lines with verified text from the council pages above; keep primarySourceUrls as authoritative links.",
    ],
  };
}

export function formatCuratedObjectKey(lgaCanonicalName: string): string {
  const n = lgaCanonicalName.trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) {
    return n;
  }
  return JSON.stringify(n);
}

export function formatCuratedEntryForPaste(lgaCanonicalName: string, row: VicLgaCuratedRow): string {
  assertCanonicalLgaName(lgaCanonicalName);
  const key = formatCuratedObjectKey(lgaCanonicalName.trim());
  const lines = JSON.stringify(row, null, 2).split("\n");
  const head = lines[0] ?? "{}";
  const rest = lines
    .slice(1)
    .map((line) => `  ${line}`)
    .join("\n");
  const body = rest ? `${head}\n${rest}` : head;
  return `  ${key}: ${body},\n`;
}

export type AddCouncilFromUrlsInput = {
  lgaCanonicalName: string;
  primarySourceUrls: string[];
  instrumentLabel?: string;
  curationStatus?: CurationStatus;
};

export function buildCuratedEntryFromUrls(input: AddCouncilFromUrlsInput): {
  key: string;
  row: VicLgaCuratedRow;
  pasteBlock: string;
} {
  assertCanonicalLgaName(input.lgaCanonicalName);
  const urls = normalizePrimarySourceUrls(input.primarySourceUrls);
  const row = createCuratedRowTemplate({
    primarySourceUrls: urls,
    instrumentLabel: input.instrumentLabel,
    curationStatus: input.curationStatus,
    councilLabel: input.lgaCanonicalName.trim(),
  });
  const pasteBlock = formatCuratedEntryForPaste(input.lgaCanonicalName.trim(), row);
  return {
    key: formatCuratedObjectKey(input.lgaCanonicalName.trim()),
    row,
    pasteBlock,
  };
}
