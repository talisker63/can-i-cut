import {
  buildCuratedEntryFromUrls,
  suggestCanonicalLgaNames,
} from "./add-council-template";

function printUsage(): void {
  console.log(`
Add a curated council entry (paste block for vic-lga-tree-local-law.ts)

Usage:
  npm run add-council -- <CanonicalLGAName> <url> [url...]

The LGA name must match vic-councils.ts exactly (e.g. Whitehorse, Merri-bek, Greater Geelong).

Example:
  npm run add-council -- Whitehorse https://www.whitehorse.vic.gov.au/planning-building/do-i-need-permit/tree-removal-lopping-and-pruning

Then copy the printed object into the CURATED map in src/vic-lga-tree-local-law.ts and replace TODO lines from the council pages.
`);
}

const argv = process.argv.slice(2).filter((a) => a !== "--");
const name = argv[0];
const urls = argv.slice(1);

if (!name || urls.length === 0) {
  printUsage();
  if (name && urls.length === 0) {
    console.error("Error: provide at least one council page URL.\n");
  }
  process.exit(1);
}

try {
  const { pasteBlock } = buildCuratedEntryFromUrls({
    lgaCanonicalName: name,
    primarySourceUrls: urls,
  });
  console.log("--- Paste the following into CURATED in vic-lga-tree-local-law.ts ---\n");
  console.log(pasteBlock);
  console.log("--- End ---\n");
  console.log("Next: edit TODO lines using the linked sources; then run npm run build.");
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`Error: ${msg}\n`);
  const sug = suggestCanonicalLgaNames(name);
  if (sug.length) {
    console.error("Similar canonical names:", sug.join(", "));
  }
  process.exit(1);
}
