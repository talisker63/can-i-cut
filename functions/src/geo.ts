import { isInVictoriaBounds, matchCouncilName } from "./vic-councils";

export type GeocodeHit = {
  lat: number;
  lng: number;
  formattedAddress: string;
  administrativeAreaLevel2?: string;
};

const NOMINATIM_UA =
  "CanICut/1.0 (can-i-cut; contact via project maintainer; +https://github.com/talisker63/)";

function pickLgaHint(addr: Record<string, string> | undefined): string | undefined {
  if (!addr) return undefined;
  const candidates = [
    addr.county,
    addr.municipality,
    addr.city_district,
    addr.hamlet,
    addr.town,
    addr.city,
    addr.suburb,
  ];
  for (const c of candidates) {
    if (c && typeof c === "string" && c.trim()) {
      return c.trim();
    }
  }
  return undefined;
}

export async function geocodeAddress(address: string): Promise<GeocodeHit> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=au&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": NOMINATIM_UA,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Geocoding failed: ${res.status}`);
  }
  const arr = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: Record<string, string>;
  }>;
  if (!arr?.length) {
    throw new Error("Geocoding: no results for that address");
  }
  const r = arr[0];
  const lat = Number.parseFloat(r.lat);
  const lng = Number.parseFloat(r.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Geocoding: invalid coordinates");
  }
  const addr = r.address;
  const stateRaw = (addr?.state || "").toLowerCase();
  if (
    stateRaw &&
    !stateRaw.includes("vic") &&
    !stateRaw.includes("victoria") &&
    !stateRaw.includes("vic.")
  ) {
    throw new Error("That location appears to be outside Victoria. Phase 1 only covers VIC.");
  }
  let administrativeAreaLevel2 = pickLgaHint(addr);
  if (administrativeAreaLevel2) {
    const v = administrativeAreaLevel2.trim().toLowerCase();
    if (v === "victoria" || v === "vic") {
      administrativeAreaLevel2 = undefined;
    }
  }
  return {
    lat,
    lng,
    formattedAddress: r.display_name,
    administrativeAreaLevel2,
  };
}

export async function resolveLgaFromOverpass(lat: number, lng: number): Promise<string | null> {
  const body = `[out:json][timeout:25];
is_in(${lat},${lng})->.a;
rel(pivot.a)["boundary"="administrative"]["admin_level"="6"];
out tags;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: `data=${encodeURIComponent(body)}`,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    elements?: Array<{ type: string; tags?: Record<string, string> }>;
  };
  const rels = (data.elements || []).filter((e) => e.type === "relation" && e.tags);
  for (const e of rels) {
    const tags = e.tags || {};
    const state = tags["is_in:state"] || tags["ISO3166-2"] || tags["addr:state"];
    if (state) {
      const s = String(state).toLowerCase();
      if (!s.includes("vic") && !s.includes("victoria")) {
        continue;
      }
    }
    const name =
      tags["name"] ||
      tags["official_name"] ||
      tags["short_name"] ||
      tags["ref:auscode"];
    if (!name) continue;
    const m = matchCouncilName(name);
    if (m) return m;
  }
  for (const e of rels) {
    const tags = e.tags || {};
    const name =
      tags["name"] ||
      tags["official_name"] ||
      tags["short_name"];
    if (!name) continue;
    const m = matchCouncilName(name);
    if (m) return m;
  }
  return null;
}

export async function resolveVictorianLga(
  address: string,
): Promise<{ lgaName: string; formattedAddress: string; lat: number; lng: number }> {
  const hit = await geocodeAddress(address);
  if (!isInVictoriaBounds(hit.lat, hit.lng)) {
    throw new Error("That location appears to be outside Victoria. Phase 1 only covers VIC.");
  }
  const fromHint = matchCouncilName(hit.administrativeAreaLevel2);
  if (fromHint) {
    return {
      lgaName: fromHint,
      formattedAddress: hit.formattedAddress,
      lat: hit.lat,
      lng: hit.lng,
    };
  }
  const fromOsm = await resolveLgaFromOverpass(hit.lat, hit.lng);
  if (fromOsm) {
    return {
      lgaName: fromOsm,
      formattedAddress: hit.formattedAddress,
      lat: hit.lat,
      lng: hit.lng,
    };
  }
  throw new Error(
    "Could not determine the Victorian council (LGA) for this address. Try including suburb and postcode, or a more precise street address.",
  );
}
