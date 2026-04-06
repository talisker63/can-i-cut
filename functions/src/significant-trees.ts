import {
  SIGNIFICANT_TREE_SOURCES,
  SIGNIFICANT_TREE_SUPPORTED_LGAS,
  type SignificantTreeSource,
} from "./significant-tree-sources";

export type SignificantTreeMatch = {
  summary: string;
  distanceMeters: number;
  locationHint?: string;
};

export type SignificantTreeLookupResult = {
  automatedCheckPerformed: boolean;
  council: string;
  dataSource: string | null;
  searchRadiusMeters: number;
  matches: SignificantTreeMatch[];
  limitationNote: string;
};

export { SIGNIFICANT_TREE_SUPPORTED_LGAS };

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function bboxDegrees(lat: number, lng: number, pad: number): [number, number, number, number] {
  const dLat = pad / 111_320;
  const dLng = pad / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

type GeoJsonFeature = {
  type?: string;
  geometry?: { type?: string; coordinates?: unknown };
  properties?: Record<string, unknown>;
};

type GeoJsonFc = { type?: string; features?: GeoJsonFeature[] };

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json, application/geo+json" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return (await res.json()) as unknown;
}

function isLikelyPrivateLandTree(lgaName: string, props: Record<string, unknown>): boolean {
  if (lgaName === "Ballarat") {
    const priv = props.private;
    if (typeof priv === "string") {
      const v = priv.trim().toLowerCase();
      if (v === "yes") return true;
      if (v === "no") return false;
    }
    return false;
  }
  if (lgaName === "Mildura") {
    const tt = props.Tree_Type;
    if (typeof tt === "string" && tt.toLowerCase().includes("street")) return false;
    return true;
  }
  if (lgaName === "Yarra") {
    const loc = props.location;
    if (typeof loc === "string" && loc.toLowerCase() === "park") return false;
    return true;
  }
  if (lgaName === "Strathbogie") {
    const site = typeof props.site_name === "string" ? props.site_name : "";
    if (/\bpark\b/i.test(site) && !/private/i.test(site)) return false;
    return true;
  }
  return true;
}

function extractCoords(
  f: GeoJsonFeature,
  coordMode: "boroondara_props" | "geometry_point" | "yarra_point",
): { lat: number; lng: number } | null {
  if (coordMode === "boroondara_props") {
    const p = f.properties || {};
    const lat = asNum(p.Lat);
    const lng = asNum(p.Long);
    if (lat !== null && lng !== null) return { lat, lng };
    return null;
  }
  if (coordMode === "geometry_point" || coordMode === "yarra_point") {
    const g = f.geometry;
    if (g?.type === "Point" && Array.isArray(g.coordinates) && g.coordinates.length >= 2) {
      const lng = asNum(g.coordinates[0]);
      const lat = asNum(g.coordinates[1]);
      if (lat !== null && lng !== null) return { lat, lng };
    }
    if (coordMode === "yarra_point") {
      const p = f.properties || {};
      const lat = asNum(p.lat);
      const lng = asNum(p.lon);
      if (lat !== null && lng !== null) return { lat, lng };
    }
  }
  return null;
}

async function lookupWfs(
  lgaName: string,
  lat: number,
  lng: number,
  radiusM: number,
  source: Extract<SignificantTreeSource, { kind: "wfs" }>,
): Promise<SignificantTreeMatch[]> {
  const [minLng, minLat, maxLng, maxLat] = bboxDegrees(lat, lng, Math.max(radiusM * 2.5, 120));
  const url =
    `https://data.gov.au/geoserver/${source.geoserverWorkspace}/wfs?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=${encodeURIComponent(source.typeName)}&outputFormat=application/json&count=200` +
    `&bbox=${encodeURIComponent(`${minLng},${minLat},${maxLng},${maxLat},urn:ogc:def:crs:OGC:1.3:CRS84`)}`;
  const data = (await fetchJson(url)) as GeoJsonFc;
  const feats = Array.isArray(data.features) ? data.features : [];
  const out: SignificantTreeMatch[] = [];
  for (const f of feats) {
    const props = f.properties || {};
    if (!isLikelyPrivateLandTree(lgaName, props)) continue;
    const c = extractCoords(f, source.coordMode);
    if (!c) continue;
    const distanceMeters = haversineMeters(lat, lng, c.lat, c.lng);
    if (distanceMeters > radiusM) continue;
    const summary = source.buildSummary(props);
    out.push({
      summary,
      distanceMeters,
    });
  }
  out.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return out;
}

type BallaratRecord = {
  record?: {
    fields?: {
      feature_location?: string;
      species?: string;
      private?: string;
      geo_point_2d?: { lat?: number; lon?: number };
    };
  };
};

async function lookupOpendatasoft(
  lgaName: string,
  lat: number,
  lng: number,
  radiusM: number,
  source: Extract<SignificantTreeSource, { kind: "opendatasoft" }>,
): Promise<SignificantTreeMatch[]> {
  const base = `${source.baseUrl}/api/v2/catalog/datasets/${encodeURIComponent(source.datasetId)}/records`;
  const url = `${base}?limit=80&geofilter.distance=${encodeURIComponent(`${lat},${lng},${radiusM}`)}`;
  const data = (await fetchJson(url)) as { records?: BallaratRecord[] };
  const recs = Array.isArray(data.records) ? data.records : [];
  const out: SignificantTreeMatch[] = [];
  for (const r of recs) {
    const f = r.record?.fields;
    if (!f?.geo_point_2d) continue;
    if (!isLikelyPrivateLandTree(lgaName, f as Record<string, unknown>)) continue;
    const tLat = asNum(f.geo_point_2d.lat);
    const tLng = asNum(f.geo_point_2d.lon);
    if (tLat === null || tLng === null) continue;
    const distanceMeters = haversineMeters(lat, lng, tLat, tLng);
    if (distanceMeters > radiusM) continue;
    const loc = typeof f.feature_location === "string" ? f.feature_location : "";
    const sp = typeof f.species === "string" ? f.species : "";
    const summary = [sp, loc].filter(Boolean).join(" — ") || "Exceptional Tree Register entry";
    out.push({ summary, distanceMeters, locationHint: loc || undefined });
  }
  out.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return out;
}

async function lookupStaticGeojson(
  lgaName: string,
  lat: number,
  lng: number,
  radiusM: number,
  source: Extract<SignificantTreeSource, { kind: "static_geojson" }>,
): Promise<SignificantTreeMatch[]> {
  const data = (await fetchJson(source.url)) as GeoJsonFc;
  const feats = Array.isArray(data.features) ? data.features : [];
  const out: SignificantTreeMatch[] = [];
  for (const f of feats) {
    const props = f.properties || {};
    if (!isLikelyPrivateLandTree(lgaName, props)) continue;
    const c = extractCoords(f, source.coordMode);
    if (!c) continue;
    const distanceMeters = haversineMeters(lat, lng, c.lat, c.lng);
    if (distanceMeters > radiusM) continue;
    const summary = source.buildSummary(props);
    const addr = typeof props.address === "string" ? props.address : "";
    out.push({
      summary,
      distanceMeters,
      locationHint: addr || undefined,
    });
  }
  out.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return out;
}

async function runSourceForLga(
  lgaName: string,
  lat: number,
  lng: number,
  radiusMeters: number,
  source: SignificantTreeSource,
): Promise<SignificantTreeLookupResult> {
  const baseLimitation =
    "Geocoding is approximate; tree stems can be offset from the building point; registers can change; some councils do not publish spatial data. This view prefers private‑land entries where the dataset includes tenure or land‑use fields; otherwise nearby listed trees of any tenure may appear. Confirm against the council’s current register, VicPlan overlays, and on-site inspection before relying on this result.";

  try {
    let matches: SignificantTreeMatch[] = [];
    if (source.kind === "wfs") {
      matches = await lookupWfs(lgaName, lat, lng, radiusMeters, source);
    } else if (source.kind === "opendatasoft") {
      matches = await lookupOpendatasoft(lgaName, lat, lng, radiusMeters, source);
    } else {
      matches = await lookupStaticGeojson(lgaName, lat, lng, radiusMeters, source);
    }
    return {
      automatedCheckPerformed: true,
      council: lgaName,
      dataSource: source.dataSourceLabel,
      searchRadiusMeters: radiusMeters,
      matches,
      limitationNote: baseLimitation,
    };
  } catch {
    return {
      automatedCheckPerformed: false,
      council: lgaName,
      dataSource: source.dataSourceLabel,
      searchRadiusMeters: radiusMeters,
      matches: [],
      limitationNote: `${baseLimitation} Automated lookup failed; use ${lgaName}’s published tree register or map and VicPlan directly.`,
    };
  }
}

export async function lookupSignificantTreeRegisterForLga(
  lgaName: string,
  lat: number,
  lng: number,
  radiusMeters = 45,
): Promise<SignificantTreeLookupResult> {
  const baseLimitation =
    "Geocoding is approximate; tree stems can be offset from the building point; registers can change; some councils do not publish spatial data. Confirm against the council’s current register, VicPlan overlays, and on-site inspection before relying on this result.";

  const source = SIGNIFICANT_TREE_SOURCES[lgaName];
  if (source) {
    return runSourceForLga(lgaName, lat, lng, radiusMeters, source);
  }

  const listed = SIGNIFICANT_TREE_SUPPORTED_LGAS.join(", ");
  return {
    automatedCheckPerformed: false,
    council: lgaName,
    dataSource: null,
    searchRadiusMeters: radiusMeters,
    matches: [],
    limitationNote: `${baseLimitation} This tool only has automated spatial register queries for: ${listed}. For ${lgaName}, use the council’s tree or planning pages and VicPlan (heritage / environmental / vegetation overlays) for this address.`,
  };
}
