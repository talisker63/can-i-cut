import { VIC_LGA_CANONICAL } from "./vic-councils";

export type CurationStatus = "verified" | "partial" | "pending";

export type VicLgaTreeLocalLawEntry = {
  lgaName: string;
  curationStatus: CurationStatus;
  instrumentLabel: string;
  lastReviewedIso: string;
  primarySourceUrls: string[];
  privateLandSummary: string;
  measurement: {
    description: string;
    points: string[];
  };
  protectedTreeCriteria: string[];
  permitRequired: {
    removal: string[];
    pruning: string[];
  };
  exemptions: string[];
  arboristChecks: string[];
  notes: string[];
};

export type CuratedLocalLawApi = {
  lgaName: string;
  curationStatus: CurationStatus;
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

export type VicLgaCuratedRow = Omit<VicLgaTreeLocalLawEntry, "lgaName">;

const CURATED: Record<string, VicLgaCuratedRow> = {
  Boroondara: {
    curationStatus: "verified",
    instrumentLabel: "Tree Protection Local Law (canopy tree definition; confirm current consolidated version on council site)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [
      "https://www.boroondara.vic.gov.au/waste-environment/trees/protected-and-significant-trees",
      "https://www.boroondara.vic.gov.au/services/planning-and-building/building/works-permits/trees-and-construction/tree-works-permits",
    ],
    privateLandSummary:
      "Canopy trees on private land generally need a tree removal permit to remove and a permit for prescribed pruning or works close to the trunk; street/nature‑strip trees are administered separately.",
    measurement: {
      description:
        "Council defines a canopy tree using trunk circumference at standard heights (definition updated over time; confirm current law).",
      points: [
        "Measure trunk circumference at 1.4 m above natural ground level; or at natural ground level per council’s canopy tree definition.",
        "Single‑stem: circumference at 1.4 m typically ≥ 110 cm qualifies as a canopy tree (verify current schedule).",
        "Alternative test at natural ground level: circumference typically ≥ 150 cm (verify current schedule).",
        "Multi‑stem: sum circumferences of stems at 1.4 m per council method (AS 4970-style measurement is commonly referenced).",
      ],
    },
    protectedTreeCriteria: [
      "Meets canopy tree size tests above, and/or is listed as a significant tree under council processes.",
      "Works within a stated distance of the trunk may also trigger a permit (confirm current distance in the local law).",
    ],
    permitRequired: {
      removal: ["Removal of a canopy tree / protected tree unless an exemption applies."],
      pruning: [
        "Pruning that is not exempt “minor” maintenance under the local law (e.g. substantial crown reduction, lopping beyond exempt limits).",
        "Works within the prescribed distance of the trunk where the local law requires it.",
      ],
    },
    exemptions: [
      "Council publishes exemptions for minor pruning and some maintenance categories — confirm current schedule.",
      "Separate rules apply to council‑managed street trees.",
    ],
    arboristChecks: [
      "Record circumference at 1.4 m and at ground level where relevant; photograph measurement position.",
      "Confirm whether the tree is also on the significant tree register or subject to a planning overlay (VicPlan).",
    ],
    notes: [
      "Council provides online tools (e.g. property/tree checks) — use in addition to field measurements.",
    ],
  },
  Yarra: {
    curationStatus: "verified",
    instrumentLabel: "General Local Law 2016 — significant tree (confirm current consolidated law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [
      "https://www.yarracity.vic.gov.au/residents/plants-and-trees/significant-trees",
      "https://www.yarracity.vic.gov.au/planning-and-building/planning-permits/guides-and-resources/vegetation-removal-destruction-or-lopping",
    ],
    privateLandSummary:
      "Significant trees on private land generally require a permit to prune, lop or remove; additional planning controls may apply.",
    measurement: {
      description: "Significant tree size is expressed as trunk diameter (related to DBH).",
      points: [
        "Measure trunk diameter at ground level or at 1.5 m above ground level per council definition.",
        "Single or multi‑stem: significant if any trunk ≥ 400 mm diameter (or combined multi‑stem test per council definition — confirm schedule).",
      ],
    },
    protectedTreeCriteria: [
      "Meets significant tree size tests and/or is entered on the municipal significant tree register.",
      "Heritage overlay or other planning overlays may impose separate vegetation controls.",
    ],
    permitRequired: {
      removal: ["Removal of a significant tree unless exempt."],
      pruning: ["Pruning, lopping or destruction of a significant tree unless exempt."],
    },
    exemptions: [
      "Council lists exemptions (e.g. minor pruning categories) in the local law — confirm current text.",
    ],
    arboristChecks: [
      "Record diameter at both permitted heights if near threshold; state multi‑stem calculation method used.",
      "Check register and VicPlan overlays for the site.",
    ],
    notes: ["Thresholds and exemptions must be read from the current General Local Law and any amending instruments."],
  },
  Stonnington: {
    curationStatus: "partial",
    instrumentLabel: "General Local Law — significant tree / tree works permit (confirm current consolidated law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: ["https://www.stonnington.vic.gov.au/Services/Trees-and-nature-strips/Tree-Works-Permit"],
    privateLandSummary:
      "Significant trees on private land typically require a Tree Works Permit for removal, pruning and some works affecting roots or the tree protection zone.",
    measurement: {
      description: "Significant tree is commonly defined using trunk circumference at ground level and at 1.4 m.",
      points: [
        "At natural ground level: total trunk circumference typically ≥ 180 cm for single or combined multi‑stems (confirm schedule).",
        "At 1.4 m above ground: apply council’s circumference tests for significant tree (confirm schedule).",
      ],
    },
    protectedTreeCriteria: [
      "Meets significant tree tests and/or heritage / overlay controls in the planning scheme for some precincts.",
    ],
    permitRequired: {
      removal: ["Removal of a significant tree unless exempt."],
      pruning: [
        "Pruning of a significant tree beyond exempt minor works.",
        "Excavation, trenching or compaction in the tree protection zone where the law requires a permit.",
      ],
    },
    exemptions: ["Minor pruning categories and dead/hazardous tree pathways — confirm current local law."],
    arboristChecks: [
      "Measure circumference at ground and 1.4 m per council diagram.",
      "Check whether a planning permit applies instead of a Tree Works Permit in nominated overlay precincts.",
    ],
    notes: ["Some properties use planning‑scheme‑only pathways; confirm VicPlan and council advice."],
  },
  "Merri-bek": {
    curationStatus: "partial",
    instrumentLabel: "General Local Law 2018 — mature trees (clause 2.5; confirm current consolidated law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: ["https://www.merri-bek.vic.gov.au/living-in-merri-bek/environment/trees/trees-on-private-property/"],
    privateLandSummary:
      "Mature trees on private land are protected; permits apply to removal and to pruning beyond stated canopy limits.",
    measurement: {
      description: "Mature tree uses trunk diameter at 1.2 m and total height.",
      points: [
        "Single trunk: diameter > 400 mm at 1.2 m above ground, or multi‑stem combined > 400 mm at 1.2 m per council method.",
        "Height typically greater than 8 m for a mature tree (confirm exact tests in current local law).",
      ],
    },
    protectedTreeCriteria: ["Meets mature tree definition and/or is on the significant tree register."],
    permitRequired: {
      removal: ["Removal of a mature / protected tree unless exempt."],
      pruning: ["Pruning removing more than the stated canopy percentage (commonly 15% — confirm current clause)."],
    },
    exemptions: ["Categories such as deadwood, minor pruning within limits — confirm schedule."],
    arboristChecks: [
      "Record DBH (or diameter) at 1.2 m and height.",
      "If near thresholds, document canopy percentage proposed to be removed.",
    ],
    notes: ["Verify clause numbering and percentages against the current Merri‑bek General Local Law."],
  },
  "Glen Eira": {
    curationStatus: "verified",
    instrumentLabel: "Canopy Tree Protection Local Law (confirm current version including amendments)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [
      "https://www.gleneira.vic.gov.au/services/planning-and-building/building/permits/canopy-tree-protection",
    ],
    privateLandSummary:
      "Canopy trees on private land require a permit for removal and for significant pruning; minor pruning may be exempt subject to limits.",
    measurement: {
      description: "Canopy tree classification uses circumference at 1.4 m (and stump/height tests in some cases).",
      points: [
        "Single stem: circumference ≥ 140 cm at 1.4 m above natural ground.",
        "Multi‑stem: sum of stem circumferences at 1.4 m ≥ 140 cm per council method.",
        "Stump / height alternative tests may apply for some forms (palm height etc.) — confirm schedule.",
      ],
    },
    protectedTreeCriteria: ["Meets canopy tree tests in the local law."],
    permitRequired: {
      removal: ["Removal of a canopy tree unless exempt."],
      pruning: ["Significant pruning of a canopy tree; exempt minor pruning is capped (e.g. annual canopy removal limit — confirm)."],
    },
    exemptions: ["Emergency hazard, dead trees in some cases, minor pruning within council limits — confirm."],
    arboristChecks: [
      "Document 1.4 m circumference for each stem; photograph.",
      "If claiming minor pruning exemption, calculate canopy percentage removed.",
    ],
    notes: ["August 2024 amendment changed some classes — confirm consolidated local law."],
  },
  Knox: {
    curationStatus: "partial",
    instrumentLabel: "Knox Planning Scheme — canopy tree (Clause 52.37 / residential development provisions; confirm current scheme)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [
      "https://www.knox.vic.gov.au/our-services/building-and-planning/planning-services-and-permits/tree-removal-and-pruning-on-private-property",
    ],
    privateLandSummary:
      "Canopy tree removal/lopping on private residential land is often controlled through the planning scheme (planning permit), not only a local law permit — confirm zone and overlays.",
    measurement: {
      description: "Use the canopy tree definition and dwelling‑boundary distance tests in the current Knox Planning Scheme — do not rely on third‑party summaries of measurements.",
      points: [
        "Open the planning scheme PDF: Clause 52.37 and schedules for residential zones used in Knox.",
        "Typically requires trunk circumference, minimum canopy spread and minimum height — confirm numeric tests in the scheme.",
        "Location: within specified distances of street frontage and rear boundary on residential lots — confirm schedule.",
      ],
    },
    protectedTreeCriteria: ["Satisfies canopy tree definition and location tests under the planning scheme."],
    permitRequired: {
      removal: ["Remove, destroy or lop a canopy tree where a planning permit is triggered."],
      pruning: ["Lopping/removal that amounts to removal or substantial destruction under the scheme."],
    },
    exemptions: ["Dead trees, declared weeds, emergency — confirm scheme exemptions."],
    arboristChecks: [
      "Measure circumference at 1.4 m, estimate canopy spread and height.",
      "Confirm lot zoning and whether a fast‑track permit pathway applies.",
    ],
    notes: [
      "Knox relies heavily on planning scheme tests; always confirm Clause 52.37 and schedules in the current Knox Planning Scheme.",
    ],
  },
  Bayside: {
    curationStatus: "partial",
    instrumentLabel: "Community Local Law — tree protection (confirm current consolidated law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [
      "https://www.bayside.vic.gov.au/services/trees-parks-and-beaches/tree-removals-private-property-permit-guide",
      "https://yoursay.bayside.vic.gov.au/trees-private-property",
    ],
    privateLandSummary:
      "Protected trees on private land generally need a local law permit to remove; permit guide references circumference at a standard height.",
    measurement: {
      description: "Protected tree commonly defined by trunk circumference measured 1 m above ground.",
      points: [
        "Single or combined (multi‑stem) trunk circumference > 155 cm at 1 m above natural ground (confirm current local law).",
      ],
    },
    protectedTreeCriteria: ["Meets protected tree size definition and/or other listing in the local law."],
    permitRequired: {
      removal: ["Removal of a protected tree unless exempt."],
      pruning: ["Pruning beyond exempt categories defined in the local law."],
    },
    exemptions: ["Confirm current exemptions for minor pruning and hazard works in the local law."],
    arboristChecks: ["Measure circumference at 1.0 m precisely; note multi‑stem summation method."],
    notes: ["Council consulted on guideline updates — always use current permit guide PDF."],
  },
  "Port Phillip": {
    curationStatus: "partial",
    instrumentLabel: "Community Local Law — significant tree permit (confirm current law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: ["https://www.portphillip.vic.gov.au/planning-and-building/construction-permits/significant-tree-permit/"],
    privateLandSummary:
      "Significant trees on private land require a permit for works that remove, prune substantially or damage the tree.",
    measurement: {
      description: "Significant tree is defined using trunk circumference measured from the base at a set height.",
      points: [
        "Circumference ≥ 150 cm measured 1 m from the base (or combined multi‑stem equivalent per council definition — confirm schedule).",
      ],
    },
    protectedTreeCriteria: ["Meets significant tree definition in the local law."],
    permitRequired: {
      removal: ["Removal of a significant tree."],
      pruning: ["Substantial pruning not covered by exemptions (e.g. clearance pruning for services may be exempt — confirm)."],
    },
    exemptions: [
      "Some pruning for clearance of footpaths, sight lines and minor branches — confirm current exemptions list.",
    ],
    arboristChecks: ["Measure 1 m from base per council diagram; document multi‑stem method."],
    notes: ["Confirm application requirements (arborist report) on the council permit page."],
  },
  "Hobsons Bay": {
    curationStatus: "partial",
    instrumentLabel: "Community Local Law — protected tree / tree removal permit (confirm current law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [
      "https://www.hobsonsbay.vic.gov.au/Services/Trees-and-nature-strips/Tree-Planting-Requests/Private-Tree-Removal",
    ],
    privateLandSummary:
      "Protected trees on private land require a tree removal permit for removal or damage; planning scheme canopy rules may also apply.",
    measurement: {
      description: "Protected tree is defined by trunk diameter at a standard height.",
      points: [
        "Trunk diameter ≥ 450 mm measured at 1.5 m above the base (confirm exact wording in current local law).",
      ],
    },
    protectedTreeCriteria: ["Diameter test at 1.5 m and/or overlay/register protections."],
    permitRequired: {
      removal: ["Removal or works causing damage to a protected tree."],
      pruning: ["Pruning beyond exempt works where the law requires a permit."],
    },
    exemptions: ["Hazard and minor works categories — confirm schedule."],
    arboristChecks: ["Use diameter tape at 1.5 m; convert to DBH if reporting in mm."],
    notes: ["Cross‑check planning scheme canopy tree provisions on the same property."],
  },
  Darebin: {
    curationStatus: "partial",
    instrumentLabel: "General Local Law — significant / mature tree (confirm current consolidated law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: ["https://www.darebin.vic.gov.au/Waste-environment-and-climate/Trees/Trees-on-private-property"],
    privateLandSummary:
      "Significant trees on private land need a permit for removal and many pruning works; verify definition in the current local law.",
    measurement: {
      description: "Typically combines trunk circumference at 1.5 m with minimum height.",
      points: [
        "Combined or single trunk circumference > 100 cm at 1.5 m above ground, and height > 8 m (confirm current thresholds — secondary summaries vary).",
      ],
    },
    protectedTreeCriteria: ["Meets significant tree tests in the local law."],
    permitRequired: {
      removal: ["Removal of a significant tree unless exempt."],
      pruning: ["Pruning beyond exempt branch size / canopy limits — confirm schedule."],
    },
    exemptions: ["Small‑branch pruning under stated diameter, noxious species, some palm maintenance — confirm."],
    arboristChecks: ["Measure circumference at 1.5 m and total height; do not rely on diameter conversion alone."],
    notes: ["Prioritise the PDF local law over third‑party summaries."],
  },
  Frankston: {
    curationStatus: "partial",
    instrumentLabel: "Tree Protection Local Law (confirm current consolidated law)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [
      "https://www.frankston.vic.gov.au/Community-and-Health/Environment/Trees-and-vegetation/Request-Local-Law-permit-for-pruning-or-removal-of-a-private-tree",
      "https://engage.frankston.vic.gov.au/tree-protection-local-law",
    ],
    privateLandSummary:
      "Private trees meeting trunk size tests need a local law permit for removal and for pruning removing more than a stated canopy fraction.",
    measurement: {
      description: "Uses trunk circumference at the base for the main test.",
      points: [
        "Trunk circumference ≥ 110 cm measured at the base (confirm definition for multi‑stem).",
      ],
    },
    protectedTreeCriteria: ["Trunk size at base exceeds threshold and tree is not exempt."],
    permitRequired: {
      removal: ["Removal of a tree meeting the protected size test."],
      pruning: ["Pruning removing more than one‑third of the outer canopy edge (confirm current fraction)."],
    },
    exemptions: ["Smaller trees, dead trees, pruning under one‑third canopy — confirm."],
    arboristChecks: ["Measure basal circumference; estimate canopy removal proportion if pruning."],
    notes: ["Fees and application kits are on the council request page."],
  },
  Manningham: {
    curationStatus: "partial",
    instrumentLabel: "Manningham Planning Scheme — canopy trees / Clause 52.37 (confirm current scheme)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: ["https://www.manningham.vic.gov.au/property-and-development/guides-and-maps/trees/remove-tree-your-property/canopy-trees-residential"],
    privateLandSummary:
      "Residential canopy trees are primarily controlled via the planning scheme (canopy tree definition and boundary location rules), not only a simple local law circumference.",
    measurement: {
      description: "Use the canopy tree definition in the current Manningham Planning Scheme (Victorian standard tests may apply).",
      points: [
        "Confirm trunk circumference, canopy spread and height tests in Clause 52.37 and schedules.",
        "Confirm distance tests from front and rear boundaries for “boundary canopy trees”.",
      ],
    },
    protectedTreeCriteria: ["Meets canopy tree definition and planning trigger for the allotment."],
    permitRequired: {
      removal: ["Remove, destroy or lop a canopy tree where a planning permit is required under the scheme."],
      pruning: ["Works that amount to destruction or substantial removal under the scheme."],
    },
    exemptions: ["Scheme exemptions for weeds, dead trees and emergencies — confirm."],
    arboristChecks: [
      "Measure per AS 4970 reporting; provide canopy spread and height for planning assessment.",
      "Check VicPlan for overlays.",
    ],
    notes: ["Do not rely on informal summaries of circumference — use the current planning scheme PDF."],
  },
  Ballarat: {
    curationStatus: "partial",
    instrumentLabel: "Exceptional Tree Register + planning/local controls (confirm current instruments)",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: ["https://www.ballarat.vic.gov.au/tree-vegetation-management"],
    privateLandSummary:
      "Ballarat uses an Exceptional Tree Register and planning controls; many private trees are assessed against register listing and scheme overlays as well as size.",
    measurement: {
      description: "Listed exceptional trees are assessed on nominated criteria; unlisted trees may still be protected by overlays.",
      points: [
        "For listing, council considers DBH bands, spread, height and significance criteria — confirm current register policy.",
        "For non‑listed trees, check planning overlays (VPO, heritage, etc.) on VicPlan.",
      ],
    },
    protectedTreeCriteria: ["On Exceptional Tree Register and/or meets overlay vegetation controls."],
    permitRequired: {
      removal: ["Removal of protected or listed trees per register/planning requirements."],
      pruning: ["Pruning that would damage or destroy protected vegetation where a permit is required."],
    },
    exemptions: ["Confirm exemptions for minor pruning and hazardous trees with council."],
    arboristChecks: ["Check geospatial register proximity; document DBH, height, spread for assessment."],
    notes: ["Open data register exists — cross‑check with on‑ground stem identity."],
  },
};

function pendingEntry(lgaName: string): VicLgaTreeLocalLawEntry {
  return {
    lgaName,
    curationStatus: "pending",
    instrumentLabel: "Not yet individually curated in this app",
    lastReviewedIso: "2026-04-06",
    primarySourceUrls: [],
    privateLandSummary:
      `${lgaName} uses a Community or General Local Law and/or the planning scheme (Clause 52.37 canopy trees, overlays) to control works to trees on private land. Numeric thresholds are not yet verified in this app’s dataset.`,
    measurement: {
      description:
        "Standard arborist practice for contested matters: measure DBH or stem diameter at 1.3–1.5 m (or height council specifies), total height, and canopy spread; retain photos.",
      points: [
        "Download the current local law PDF from the council website.",
        "Run a VicPlan property report for overlays affecting vegetation.",
        "Phone council’s statutory planning or local laws team if the tree is near a size threshold.",
      ],
    },
    protectedTreeCriteria: ["Will be listed in the council’s local law or planning scheme for that site."],
    permitRequired: {
      removal: ["Confirm whether a local law permit, planning permit or both apply."],
      pruning: ["Confirm exempt minor pruning vs permit‑triggering works in the current law."],
    },
    exemptions: ["Read exemption schedules in the current local law and planning scheme."],
    arboristChecks: [
      "Document measurements with method statement.",
      "Retain before/after canopy estimates if pruning permit is uncertain.",
    ],
    notes: [
      `This LGA (${lgaName}) is queued for manual curation — thresholds may be added in a future app update.`,
    ],
  };
}

export function getTreeLocalLawForLga(lgaName: string): VicLgaTreeLocalLawEntry {
  const row = CURATED[lgaName];
  if (row) {
    return { lgaName, ...row };
  }
  return pendingEntry(lgaName);
}

export function formatCuratedLocalLawForPrompt(entry: VicLgaTreeLocalLawEntry): string {
  if (entry.curationStatus === "pending") {
    return [
      `CURATED DATA STATUS: pending for ${entry.lgaName}.`,
      "Do not invent numeric thresholds. Tell the arborist to read the council's current local law PDF and VicPlan overlays, and to phone council if near a threshold.",
      `Generic guidance only: ${entry.privateLandSummary}`,
    ].join("\n");
  }
  return [
    `CURATED DATA STATUS: ${entry.curationStatus} for ${entry.lgaName}.`,
    `Instrument (label): ${entry.instrumentLabel}`,
    `Sources to verify: ${entry.primarySourceUrls.join(" | ")}`,
    `Last app review: ${entry.lastReviewedIso}`,
    `Private land: ${entry.privateLandSummary}`,
    "Measurement:",
    ...entry.measurement.points.map((p) => `  - ${p}`),
    "Protected tree criteria:",
    ...entry.protectedTreeCriteria.map((p) => `  - ${p}`),
    "Permit — removal:",
    ...entry.permitRequired.removal.map((p) => `  - ${p}`),
    "Permit — pruning:",
    ...entry.permitRequired.pruning.map((p) => `  - ${p}`),
    "Exemptions (confirm):",
    ...entry.exemptions.map((p) => `  - ${p}`),
    "Arborist checks:",
    ...entry.arboristChecks.map((p) => `  - ${p}`),
    "Notes:",
    ...entry.notes.map((p) => `  - ${p}`),
    "You must align treeSizeMeasurementBullets and the allow/require approval bullets with this curated content where it is consistent. Flag any conflict and tell the user to verify against the council’s current instrument.",
  ].join("\n");
}

export function toCuratedLocalLawApi(entry: VicLgaTreeLocalLawEntry): CuratedLocalLawApi {
  return {
    lgaName: entry.lgaName,
    curationStatus: entry.curationStatus,
    instrumentLabel: entry.instrumentLabel,
    lastReviewedIso: entry.lastReviewedIso,
    primarySourceUrls: entry.primarySourceUrls,
    privateLandSummary: entry.privateLandSummary,
    measurementDescription: entry.measurement.description,
    measurementPoints: entry.measurement.points,
    protectedTreeCriteria: entry.protectedTreeCriteria,
    permitRequiredRemoval: entry.permitRequired.removal,
    permitRequiredPruning: entry.permitRequired.pruning,
    exemptions: entry.exemptions,
    arboristChecks: entry.arboristChecks,
    notes: entry.notes,
  };
}

export const CURATED_LGA_KEYS = Object.keys(CURATED).sort();

export const PENDING_LGA_COUNT = VIC_LGA_CANONICAL.length - CURATED_LGA_KEYS.length;
