// Fails when the app references a name that is never declared or imported
// (TS2304 / TS2552), e.g. t("...") in a component with no useTranslation().
// Vite builds without typechecking, so such a bug ships and crashes the page at
// runtime (homepage, 2026-10-14 to 10-16). Other tsc errors (typed i18n keys,
// TS2345) are pre-existing noise and deliberately ignored here.
import { spawnSync } from "node:child_process";

const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.app.json"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
if (r.error) {
  console.error("check:names could not run tsc:", r.error.message);
  process.exit(2);
}
const out = `${r.stdout || ""}${r.stderr || ""}`;
const hits = out.split("\n").filter((l) => /error TS(2304|2552)\b/.test(l));
if (hits.length > 0) {
  console.error(`Undeclared names found (${hits.length}):`);
  for (const l of hits) console.error("  " + l);
  process.exit(1);
}
if (!/error TS\d+/.test(out) && r.status !== 0) {
  console.error("tsc failed without a diagnostic:\n" + out.slice(0, 2000));
  process.exit(2);
}
console.log("check:names OK: no undeclared names");
