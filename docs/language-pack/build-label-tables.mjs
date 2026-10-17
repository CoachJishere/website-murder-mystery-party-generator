// Regenerates supabase/functions/review-package-quality/label-tables.ts from docs/language-pack/header-labels.json (ADR-0152).
// The JSON is the single source of truth; the edge function cannot read the docs folder at runtime, so it carries a generated copy.
// Run: node docs/language-pack/build-label-tables.mjs          (writes the file)
//      node docs/language-pack/build-label-tables.mjs --check  (exits 1 when the copy is stale; used by label-conformity.test.mjs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const json = JSON.parse(fs.readFileSync(path.join(here, "header-labels.json"), "utf8")).languages;
const CODE = { Spanish: "es", German: "de", French: "fr", Italian: "it", Portuguese: "pt", "European Portuguese": "pt-pt", Dutch: "nl", Danish: "da", Swedish: "sv" };
const out = path.join(here, "../../supabase/functions/review-package-quality/label-tables.ts");

const byCode = {};
for (const [name, table] of Object.entries(json)) {
  if (!CODE[name]) throw new Error(`no language code for ${name}`);
  byCode[CODE[name]] = table;
}
const src = `// GENERATED from docs/language-pack/header-labels.json by docs/language-pack/build-label-tables.mjs (ADR-0152). Do not edit by hand.
// Keys are the English template labels of the Make Child blueprint; values are the canonical wording for that language.
export const LABELS_BY_CODE: Record<string, Record<string, string>> = ${JSON.stringify(byCode, null, 1)};
`;
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  if (cur !== src) { console.error("label-tables.ts is out of date: run node docs/language-pack/build-label-tables.mjs"); process.exit(1); }
  console.log("label-tables.ts is in sync with header-labels.json");
} else {
  fs.writeFileSync(out, src);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${Object.keys(byCode).join(", ")})`);
}
