export type CoordMode = "boroondara_props" | "geometry_point" | "yarra_point";

export type WfsSignificantTreeSource = {
  kind: "wfs";
  dataSourceLabel: string;
  geoserverWorkspace: string;
  typeName: string;
  coordMode: CoordMode;
  buildSummary: (properties: Record<string, unknown>) => string;
};

export type OpendatasoftSignificantTreeSource = {
  kind: "opendatasoft";
  dataSourceLabel: string;
  baseUrl: string;
  datasetId: string;
};

export type StaticGeoJsonSignificantTreeSource = {
  kind: "static_geojson";
  dataSourceLabel: string;
  url: string;
  coordMode: "yarra_point";
  buildSummary: (properties: Record<string, unknown>) => string;
};

export type SignificantTreeSource =
  | WfsSignificantTreeSource
  | OpendatasoftSignificantTreeSource
  | StaticGeoJsonSignificantTreeSource;

export const SIGNIFICANT_TREE_SOURCES: Record<string, SignificantTreeSource> = {
  Boroondara: {
    kind: "wfs",
    dataSourceLabel: "data.gov.au — City of Boroondara Significant Tree (WFS)",
    geoserverWorkspace: "significant-tree",
    typeName: "ckan_14e2b87e_c733_4071_b604_c0cb33d14a42",
    coordMode: "boroondara_props",
    buildSummary: (p) => {
      const botanical = typeof p.BOTANICALN === "string" ? p.BOTANICALN : "";
      const common = typeof p.COMMONNAME === "string" ? p.COMMONNAME : "";
      const suburb = typeof p.SUBURB === "string" ? p.SUBURB : "";
      const streetNr = typeof p.STREETNR === "string" ? p.STREETNR : "";
      const locality = typeof p.LOCALITY === "string" ? p.LOCALITY : "";
      const species = [botanical, common].filter(Boolean).join(" — ");
      const locHint = [streetNr, locality, suburb].filter(Boolean).join(", ");
      return species ? `${species}${locHint ? ` (${locHint})` : ""}` : locHint || "Listed significant tree";
    },
  },
  Mildura: {
    kind: "wfs",
    dataSourceLabel: "data.gov.au — Mildura Rural City Council Significant Trees (WFS)",
    geoserverWorkspace: "significant-trees",
    typeName: "ckan_5063f2db_3d4a_4de6_b53f_e8dd378f759a",
    coordMode: "geometry_point",
    buildSummary: (p) => {
      const genus = typeof p.Genus === "string" ? p.Genus : "";
      const species = typeof p.Species === "string" ? p.Species : "";
      const common = typeof p.Common_Nam === "string" ? p.Common_Nam : "";
      const loc = typeof p.Location_ === "string" ? p.Location_ : "";
      const sp = [genus, species].filter(Boolean).join(" ");
      const name = [sp, common].filter(Boolean).join(" — ");
      return name ? `${name}${loc ? ` (${loc})` : ""}` : loc || "Significant tree";
    },
  },
  Strathbogie: {
    kind: "wfs",
    dataSourceLabel: "data.gov.au — Strathbogie Shire Significant Trees (WFS)",
    geoserverWorkspace: "strathbogie-shire-significant-trees",
    typeName: "ckan_5f945c9d_5e71_446e_81e7_7a4e40ae9d2f",
    coordMode: "geometry_point",
    buildSummary: (p) => {
      const genus = typeof p.genus === "string" ? p.genus : "";
      const species = typeof p.species === "string" ? p.species : "";
      const common = typeof p.common_nam === "string" ? p.common_nam : "";
      const site = typeof p.site_name === "string" ? p.site_name : "";
      const sp = [genus, species].filter(Boolean).join(" ");
      const name = [sp, common].filter(Boolean).join(" — ");
      return name ? `${name}${site ? ` (${site})` : ""}` : site || "Significant tree";
    },
  },
  Yarra: {
    kind: "static_geojson",
    dataSourceLabel: "data.gov.au — City of Yarra significant trees (GeoJSON)",
    url:
      "https://data.gov.au/data/dataset/4b950f69-8816-45a7-8788-951d788287bd/resource/b15b4b1c-969f-4c8c-bb32-be57554eeb79/download/yarra-significant-trees.geojson",
    coordMode: "yarra_point",
    buildSummary: (p) => {
      const genus = typeof p.genus === "string" ? p.genus : "";
      const species = typeof p.species === "string" ? p.species : "";
      const common = typeof p.common === "string" ? p.common : "";
      const addr = typeof p.address === "string" ? p.address : "";
      const sp = [genus, species].filter(Boolean).join(" ");
      const name = [sp, common].filter(Boolean).join(" — ");
      return name ? `${name}${addr ? ` (${addr})` : ""}` : addr || "Significant tree";
    },
  },
  Ballarat: {
    kind: "opendatasoft",
    dataSourceLabel: "data.ballarat.vic.gov.au — Exceptional Tree Register (API)",
    baseUrl: "https://data.ballarat.vic.gov.au",
    datasetId: "exceptional-tree-register",
  },
};

export const SIGNIFICANT_TREE_SUPPORTED_LGAS = Object.keys(SIGNIFICANT_TREE_SOURCES).sort();
