// Finds hard-coded English in user-facing React code (ADR-0161). Run: npm run audit:i18n
// Scans src/**/*.tsx with the TypeScript parser for JSX text, text-like JSX attributes (placeholder, title, aria-label, alt, ...) and
// toast() arguments that are not inside t(). Exits 1 when it finds anything outside the allowlist below, so it can gate a commit.
// What is skipped on purpose: Cold Case (not launched), admin, dev preview routes, shadcn ui, and components nothing imports.
// To allow a string that is not translatable (a brand, a handle), add it to ALLOW_TEXT; to skip a file, add it to SKIP_FILE.
import ts from "typescript";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP_FILE = /(\/ui\/|Admin|admin|Preview|ColorSystemGuide|FontPreview|AIInputWithLoadingDemo|ChatDemo|ColdCase|MysteryRoomHero|MysteryPackage\.tsx$|CharacterRoleSelector|CharacterRoleAssignment|ImportCharactersButton|ImportCharactersDialog|CharacterImportSection|CharacterImportButton|integrations\/|App\.tsx$)/;
const ALLOW_TEXT = [
  /^(&nbsp;|&copy;|&amp;|&[a-z]+;)+$/i,                      // entities
  /^Mystery Maker\.?$/i, /^MYSTERY MAKER$/, /^Jonathan Miller$/, /^Narrativa Improv Festival$/, // brand and proper names
  /^(LinkedIn|YouTube) — /, /^alt="Trustpilot"$/, /^Website$/, // handles, brand logos, the hidden honeypot label
  /@[a-z0-9.-]+\.[a-z]+/i, /^[a-z0-9.-]+\.(party|com)$/i,    // emails and domains
  /placeholder="your@email\.com"/,
];
const ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "description", "aria-description"]);
const looksTextual = (s) => /[A-Za-z]{3,}/.test(s) && !/^[\s\W\d_]*$/.test(s) && !/^(https?:|\/|#|\.|@)/.test(s.trim());

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? files(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

export function scanSource(text, file = "x.tsx") {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits = [];
  const add = (n, t) => { if (!ALLOW_TEXT.some((rx) => rx.test(t))) hits.push([sf.getLineAndCharacterOfPosition(n.getStart()).line + 1, t]); };
  (function visit(n) {
    if (n.kind === ts.SyntaxKind.JsxText) {
      const t = n.getText().replace(/\s+/g, " ").trim();
      if (t.length >= 3 && looksTextual(t)) add(n, t);
    } else if (n.kind === ts.SyntaxKind.JsxAttribute && n.initializer && ts.isStringLiteral(n.initializer) && ATTRS.has(n.name.getText())) {
      const t = n.initializer.text;
      if (t.length >= 3 && looksTextual(t)) add(n, `${n.name.getText()}="${t}"`);
    } else if (ts.isCallExpression(n) && /^toast(\.\w+)?$/.test(n.expression.getText())) {
      const a = n.arguments[0];
      if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) add(n, `toast: ${a.getText().slice(0, 90)}`);
      else if (a && ts.isTemplateExpression(a) && !/\bt\(|i18n\.t\(/.test(a.getText())) add(n, `toast: ${a.getText().slice(0, 90)}`);
    }
    ts.forEachChild(n, visit);
  })(sf);
  return hits;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let total = 0;
  for (const f of files(path.join(root, "src"))) {
    if (SKIP_FILE.test(f)) continue;
    const hits = scanSource(fs.readFileSync(f, "utf8"), f);
    if (!hits.length) continue;
    total += hits.length;
    console.log(path.relative(root, f));
    for (const [l, t] of hits) console.log(`  ${l}: ${t.slice(0, 120)}`);
  }
  console.log(total === 0 ? "audit:i18n clean" : `audit:i18n found ${total} hard-coded string(s): move them to src/i18n/locales/*.json and use t()`);
  process.exit(total === 0 ? 0 : 1);
}
