import { VertexAI } from "@google-cloud/vertexai";

export type TreeKind = "native" | "non_native" | "noxious";

export type RegulationPayload = {
  councilRegulationBullets: string[];
  stateRegulationBullets: string[];
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
    !Array.isArray(parsed.councilRegulationBullets) ||
    !Array.isArray(parsed.stateRegulationBullets) ||
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
      temperature: 0.35,
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
  },
): Promise<RegulationPayload> {
  const prompt = `You summarise tree pruning and removal compliance guidance for qualified arborists working in Victoria, Australia only.

Site context:
- Resolved council (LGA): ${input.lgaName}
- Geocoded address label: ${input.formattedAddress}
- Tree category for the user: ${input.treeKind} (${treeKindLabel(input.treeKind)})

Output requirements:
- Produce concise dot-point bullets only (no numbering prefix in the string content).
- councilRegulationBullets: rules typically enforced or administered by ${input.lgaName} under local planning schemes, local laws, and council tree/vegetation controls where relevant to pruning or removal near private property or public land interfaces. Do not invent permit or DA numbers.
- stateRegulationBullets: Victoria-wide rules that commonly apply (for example native vegetation controls, biodiversity, protected species, fire/fuel management where relevant, roadside management where relevant, agricultural weed/noxious declarations where relevant). Stay high level and avoid inventing instrument numbers.
- nativeOrNoxiousBullets: If treeKind is native or noxious, add extra bullets that distinguish how those categories may change obligations. If treeKind is non_native, return an empty array for nativeOrNoxiousBullets.
- regulatoryRelationshipNote: Explain in plain English that both council and Victoria state requirements can apply; council rules can be stricter or more site-specific; the more restrictive or specific requirement usually governs for that site; state law still applies where not displaced. This is general guidance only.
- lastUpdatedNote: One sentence that the user must verify details against current council planning scheme, overlays, permits, and state law before acting.

If uncertain about a specific control, say to confirm with ${input.lgaName} and to check current Victorian instruments rather than guessing.

Return ONLY valid JSON with this exact shape (no markdown fences):
{
  "councilRegulationBullets": ["..."],
  "stateRegulationBullets": ["..."],
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
