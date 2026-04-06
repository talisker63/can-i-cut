export const VIC_LGA_CANONICAL = [
  "Alpine",
  "Ararat",
  "Ballarat",
  "Banyule",
  "Bass Coast",
  "Baw Baw",
  "Bayside",
  "Benalla",
  "Boroondara",
  "Brimbank",
  "Buloke",
  "Campaspe",
  "Cardinia",
  "Casey",
  "Central Goldfields",
  "Colac Otway",
  "Corangamite",
  "Darebin",
  "East Gippsland",
  "Frankston",
  "Gannawarra",
  "Glen Eira",
  "Glenelg",
  "Golden Plains",
  "Greater Bendigo",
  "Greater Dandenong",
  "Greater Geelong",
  "Greater Shepparton",
  "Hepburn",
  "Hindmarsh",
  "Hobsons Bay",
  "Horsham",
  "Hume",
  "Indigo",
  "Kingston",
  "Knox",
  "Latrobe",
  "Loddon",
  "Macedon Ranges",
  "Manningham",
  "Mansfield",
  "Maribyrnong",
  "Maroondah",
  "Melbourne",
  "Melton",
  "Merri-bek",
  "Mildura",
  "Mitchell",
  "Moira",
  "Monash",
  "Moonee Valley",
  "Moorabool",
  "Mornington Peninsula",
  "Mount Alexander",
  "Moyne",
  "Murrindindi",
  "Nillumbik",
  "Northern Grampians",
  "Port Phillip",
  "Pyrenees",
  "Queenscliffe",
  "South Gippsland",
  "Southern Grampians",
  "Stonnington",
  "Strathbogie",
  "Surf Coast",
  "Swan Hill",
  "Towong",
  "Wangaratta",
  "Warrnambool",
  "Wellington",
  "West Wimmera",
  "Whitehorse",
  "Whittlesea",
  "Wodonga",
  "Wyndham",
  "Yarra",
  "Yarra Ranges",
  "Yarriambiack",
] as const;

const ALIAS_TO_CANONICAL: Record<string, string> = {
  "moreland": "Merri-bek",
  "city of moreland": "Merri-bek",
  "merri bek": "Merri-bek",
  "merri-bek city": "Merri-bek",
  "city of merri-bek": "Merri-bek",
  "city of melbourne": "Melbourne",
  "melbourne city": "Melbourne",
  "city of greater geelong": "Greater Geelong",
  "geelong": "Greater Geelong",
  "greater geelong city": "Greater Geelong",
  "city of greater bendigo": "Greater Bendigo",
  "bendigo": "Greater Bendigo",
  "city of ballarat": "Ballarat",
  "ballarat city": "Ballarat",
  "city of wyndham": "Wyndham",
  "city of casey": "Casey",
  "city of frankston": "Frankston",
  "city of knox": "Knox",
  "city of monash": "Monash",
  "city of whitehorse": "Whitehorse",
  "city of boroondara": "Boroondara",
  "city of stonnington": "Stonnington",
  "city of port phillip": "Port Phillip",
  "city of yarra": "Yarra",
  "city of maribyrnong": "Maribyrnong",
  "city of darebin": "Darebin",
  "city of hume": "Hume",
  "city of whittlesea": "Whittlesea",
  "city of melton": "Melton",
  "city of brimbank": "Brimbank",
  "city of maroondah": "Maroondah",
  "city of kingston": "Kingston",
  "city of bayside": "Bayside",
  "city of glen eira": "Glen Eira",
  "city of kingston (vic)": "Kingston",
  "colac-otway": "Colac Otway",
  "colac otway shire": "Colac Otway",
  "east gippsland shire": "East Gippsland",
  "yarra ranges shire": "Yarra Ranges",
  "mornington peninsula shire": "Mornington Peninsula",
  "surf coast shire": "Surf Coast",
  "bass coast shire": "Bass Coast",
  "south gippsland shire": "South Gippsland",
  "baw baw shire": "Baw Baw",
  "wellington shire": "Wellington",
  "latrobe city": "Latrobe",
  "wodonga city": "Wodonga",
  "wangaratta rural city": "Wangaratta",
  "shepparton": "Greater Shepparton",
  "city of greater shepparton": "Greater Shepparton",
  "greater dandenong city": "Greater Dandenong",
  "dandenong": "Greater Dandenong",
  "moonee valley city": "Moonee Valley",
  "hobsons bay city": "Hobsons Bay",
  "manningham city": "Manningham",
  "boroondara city": "Boroondara",
};

export function normalizeCouncilToken(s: string): string {
  let t = s.toLowerCase().trim();
  t = t.replace(/\bcity of\b/g, "").replace(/\bshire of\b/g, "");
  t = t.replace(/\brural city of\b/g, "").replace(/\bborough of\b/g, "");
  t = t.replace(/\bshire\b/g, "").replace(/\bcouncil\b/g, "");
  t = t.replace(/\s+/g, " ").trim();
  t = t.replace(/-/g, " ");
  return t;
}

export function matchCouncilName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const aliasKey = normalizeCouncilToken(trimmed);
  if (ALIAS_TO_CANONICAL[aliasKey]) return ALIAS_TO_CANONICAL[aliasKey];
  const collapsed = aliasKey.replace(/\s/g, "");
  for (const [k, v] of Object.entries(ALIAS_TO_CANONICAL)) {
    if (k.replace(/\s/g, "") === collapsed) return v;
  }
  const norm = normalizeCouncilToken(trimmed);
  for (const name of VIC_LGA_CANONICAL) {
    const cn = normalizeCouncilToken(name);
    if (norm === cn) return name;
    if (norm.endsWith(cn) || cn.endsWith(norm)) {
      if (Math.abs(norm.length - cn.length) <= 12) return name;
    }
  }
  for (const name of VIC_LGA_CANONICAL) {
    const cn = normalizeCouncilToken(name);
    if (norm.includes(cn) || cn.includes(norm)) {
      if (cn.length >= 6 && (norm.includes(cn) || cn.includes(norm))) return name;
    }
  }
  return null;
}

export function isInVictoriaBounds(lat: number, lng: number): boolean {
  return lat >= -39.35 && lat <= -33.85 && lng >= 140.75 && lng <= 150.1;
}
