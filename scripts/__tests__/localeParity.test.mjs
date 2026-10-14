// Run: node scripts/__tests__/localeParity.test.mjs   (npm run test:i18n)
// Every locale file must have every key of en.json, with the same {{placeholders}} and <tags>, and the audit scanner must work.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanSource } from "../auditI18n.mjs";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../src/i18n/locales");
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, p + k + ".") : [[p + k, v]]));
const load = (l) => Object.fromEntries(flat(JSON.parse(fs.readFileSync(path.join(dir, l + ".json"), "utf8"))));
const en = load("en");
const marks = (s) => (String(s).match(/\{\{\w+\}\}|<\/?\w+>/g) ?? []).sort().join();
const problems = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json") && x !== "en.json")) {
  const code = f.replace(".json", ""), d = load(code);
  for (const k of Object.keys(en)) {
    if (!(k in d)) problems.push(`${code}: missing ${k}`);
    else if (typeof en[k] === "string" && marks(en[k]) !== marks(d[k])) problems.push(`${code}: placeholders/tags differ at ${k}`);
  }
}
assert.deepEqual(problems, [], problems.slice(0, 15).join("\n"));
console.log("ok   locale files have every key with matching placeholders and tags");

assert.equal(scanSource('const A = () => <p>Hello there friend</p>;').length, 1);
assert.equal(scanSource('const A = () => <p>{t("a.b")}</p>;').length, 0);
assert.equal(scanSource('const A = () => <input placeholder="Search by title" />;').length, 1);
assert.equal(scanSource('toast.error("Something failed here");').length, 1);
assert.equal(scanSource('toast.error(`Failed: ${m}`);').length, 1);
assert.equal(scanSource('toast.error(t("x.y"));').length, 0);
assert.equal(scanSource('const A = () => <a href="x">Jonathan Miller</a>;').length, 0);
assert.equal(scanSource('const A = () => <p>support@mysterymaker.party</p>;').length, 0);
console.log("ok   the audit scanner flags English and allows brands, emails and t() calls");
