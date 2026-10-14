// Regenerates supabase/functions/_shared/packageScaffoldTables.ts from docs/language-pack/scaffold-labels.json (ADR-0161).
// The JSON is the single source of truth; edge functions cannot read the docs folder at runtime, so they carry a generated copy.
// Run: node docs/language-pack/build-scaffold-tables.mjs          (writes the file)
//      node docs/language-pack/build-scaffold-tables.mjs --check  (exits 1 when the copy is stale; used by packageScaffold.test.mjs)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const json = JSON.parse(fs.readFileSync(path.join(here, "scaffold-labels.json"), "utf8")).languages;
const CODE = { Spanish: "es", French: "fr", German: "de", Italian: "it", Portuguese: "pt", Dutch: "nl", Danish: "da", Swedish: "sv", Finnish: "fi", Korean: "ko", Japanese: "ja", Chinese: "zh-cn" };
const out = path.join(here, "../../supabase/functions/_shared/packageScaffoldTables.ts");

const byCode = {};
for (const [name, table] of Object.entries(json)) {
  if (!CODE[name]) throw new Error(`no language code for ${name}`);
  byCode[CODE[name]] = table;
}
const src = `// GENERATED from docs/language-pack/scaffold-labels.json by docs/language-pack/build-scaffold-tables.mjs (ADR-0161). Do not edit by hand.
// Per language: headers (text after the #s), lines (whole lines), directions (text inside *[ ]*), cue (text with {n}), all keyed by the English template string, and absent (the host note a removal appends, with {name}).
export type ScaffoldTable = { headers: Record<string, string>; lines: Record<string, string>; directions: Record<string, string>; cue: string; absent: string };
export const SCAFFOLD_BY_CODE: Record<string, ScaffoldTable> = ${JSON.stringify(byCode, null, 1)};
`;
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  if (cur !== src) { console.error("packageScaffoldTables.ts is out of date: run node docs/language-pack/build-scaffold-tables.mjs"); process.exit(1); }
  console.log("packageScaffoldTables.ts is in sync with scaffold-labels.json");
} else {
  fs.writeFileSync(out, src);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${Object.keys(byCode).join(", ")})`);
}
