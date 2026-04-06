import { VertexAI } from "@google-cloud/vertexai";
import { formatCuratedLocalLawForPrompt, type VicLgaTreeLocalLawEntry } from "./vic-lga-tree-local-law";

export type TreeKind = "native" | "non_native" | "noxious";

export type RegulationPayload = {
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
};

type VertexAttempt = { location: string; model: string };

const VERTEX_ATTEMPTS: VertexAttempt[] = [
  { location: "us-central1", model: "gemini-2.5-flash" },
  { location: "us-central1", model: "gemini-2.5-flash-lite" },
  { location: "us-central1", model: "gemini-2.0-flash-001" },
  { location: "us-central1", model: "gemini-2.0-flash-lite-001" },
  { location: "global", model: "gemini-2.5-flash" },
  { location: "global", model: "gemini-2.5-flash-lite" },
  { location: "global", model: "gemini-2.0-flash-001" },
  { location: "global", model: "gemini-2.0-flash-lite-001" },
];

function treeKindLabel(kind: TreeKind): string {
  if (kind === "native") return "native or indigenous to the region";
  if (kind === "noxious") return "noxious weed or declared pest plant (where applicable)";
  return "non-native (exotic) for context only";
}

function parseModelJson(text: string): RegulationPayload {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }
  const parsed = JSON.parse(t) as RegulationPayload;
  if (
    typeof parsed.privateLandScopeNote !== "string" ||
    !Array.isArray(parsed.treeSizeMeasurementBullets) ||
    !Array.isArray(parsed.lgaPrivateTreeProtectionBullets) ||
    !Array.isArray(parsed.pruneTypicallyAllowedWithoutPermitBullets) ||
    !Array.isArray(parsed.pruneTypicallyRequiresApprovalBullets) ||
    !Array.isArray(parsed.removalTypicallyAllowedWithoutPermitBullets) ||
    !Array.isArray(parsed.removalTypicallyRequiresApprovalBullets) ||
    !Array.isArray(parsed.statePrivateLandConsiderationsBullets) ||
    !Array.isArray(parsed.nativeOrNoxiousBullets) ||
    typeof parsed.regulatoryRelationshipNote !== "string" ||
    typeof parsed.lastUpdatedNote !== "string"
  ) {
    throw new Error("Model returned an unexpected JSON shape");
  }
  return parsed;
}

function extractText(result: {
  response: {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
}): string {
  const t = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!t) {
    throw new Error("Empty model response");
  }
  return t;
}

async function runVertexPrompt(
  projectId: string,
  location: string,
  modelId: string,
  prompt: string,
): Promise<RegulationPayload> {
  const vertex = new VertexAI({ project: projectId, location });
  const model = vertex.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.25,
    },
  });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return parseModelJson(extractText(result));
}

export async function generateRegulationSummary(
  projectId: string,
  input: {
    lgaName: string;
    formattedAddress: string;
    treeKind: TreeKind;
    curatedEntry: VicLgaTreeLocalLawEntry;
  },
): Promise<RegulationPayload> {
  const curatedBlock = formatCuratedLocalLawForPrompt(input.curatedEntry);

  const prompt = `You advise qualified arborists in Victoria, Australia. The client cares only about trees on PRIVATE LAND (allotment boundaries, residential or commercial private property). Do not centre advice on street trees, nature strips, or council‑managed public trees; mention briefly that those are usually council‑controlled and different rules apply.

---
${curatedBlock}
---

Site context:
- Council (LGA): ${input.lgaName}
- Address (geocoded label): ${input.formattedAddress}
- Tree kind hint: ${input.treeKind} (${treeKindLabel(input.treeKind)})

Your job: summarise how ${input.lgaName} typically protects trees on private land under local law and planning scheme tools, and what an arborist should verify before pruning or removing. Use plain language. This is general guidance only, not legal advice.

If the curated block above contains verified or partial measurements for ${input.lgaName}, you MUST weave those measurements and permit triggers into treeSizeMeasurementBullets and the four prune/removal bullet lists. Do not contradict the curated figures. If status is pending, you must not invent thresholds and must say this council is not yet numerically curated in the app.

Rules:
- treeSizeMeasurementBullets: Short bullets on what to measure on site and how (Australian standard DBH at 1.3 m unless multi‑stem; total height; canopy spread if relevant). Explain that ${input.lgaName} often ties permit triggers to size classes or “significant” definitions — the arborist must compare measured dimensions to the CURRENT local law / planning scheme for ${input.lgaName}. Do not invent numeric thresholds (no fake cm, m, or percentages). If you mention example sizes, label them clearly as illustrative and say to confirm from council.
- lgaPrivateTreeProtectionBullets: Dot points on how ${input.lgaName} typically applies tree protection ON PRIVATE LAND (local law permit for removal or substantial pruning; planning permits when overlays/schedules apply; municipal significant tree registers; heritage overlays). Name mechanisms, not fake clause numbers.
- pruneTypicallyAllowedWithoutPermitBullets: Work that is often exempt or low‑risk for private trees under typical council frameworks (e.g. deadwood removal within exempt categories, minor formative pruning where local law allows). Use cautious wording (“often”, “may”) and say confirm current ${input.lgaName} local law.
- pruneTypicallyRequiresApprovalBullets: Private‑tree pruning that commonly needs a permit or approval (e.g. crown reduction beyond minor maintenance, lopping above exempt thresholds, pruning listed or overlay‑protected trees). No invented permit codes.
- removalTypicallyAllowedWithoutPermitBullets: Rare cases sometimes allowed without a tree permit (e.g. dead/dangerous tree with conditions, noxious species where state/local law allows) — stress verification with ${input.lgaName}.
- removalTypicallyRequiresApprovalBullets: Removal situations that typically need approval on private land (over size thresholds, heritage, vegetation overlays, significant tree listing, native vegetation pathways where applicable).
- statePrivateLandConsiderationsBullets: Brief Victorian state layers that still affect private blocks (relevant planning overlays on VicPlan, native vegetation where triggered, wildlife). Avoid inventing instrument numbers.
- nativeOrNoxiousBullets: If treeKind is native or noxious, add bullets on how that can change removal or clearing obligations on private land. If non_native, return [].
- privateLandScopeNote: Two or three sentences restating private‑land focus and that measured size must be checked against ${input.lgaName}’s current instruments.
- regulatoryRelationshipNote: One short paragraph: council local law and planning scheme can both apply to private sites; stricter rule wins; verify VicPlan and council.
- lastUpdatedNote: One sentence: verify all details against current ${input.lgaName} local law, planning scheme, VicPlan, and registers before works.

If unsure about ${input.lgaName}, say to confirm with the council rather than guessing.

Return ONLY valid JSON with this exact shape (no markdown fences):
{
  "privateLandScopeNote": "...",
  "treeSizeMeasurementBullets": ["..."],
  "lgaPrivateTreeProtectionBullets": ["..."],
  "pruneTypicallyAllowedWithoutPermitBullets": ["..."],
  "pruneTypicallyRequiresApprovalBullets": ["..."],
  "removalTypicallyAllowedWithoutPermitBullets": ["..."],
  "removalTypicallyRequiresApprovalBullets": ["..."],
  "statePrivateLandConsiderationsBullets": ["..."],
  "nativeOrNoxiousBullets": ["..."],
  "regulatoryRelationshipNote": "...",
  "lastUpdatedNote": "..."
}`;

  let lastErr: unknown;
  for (const { location, model } of VERTEX_ATTEMPTS) {
    try {
      return await runVertexPrompt(projectId, location, model, prompt);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
