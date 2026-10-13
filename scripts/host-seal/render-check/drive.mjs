/**
 * Drives the bundled real components with Playwright (chromium) over file://, from <OUT>/fixtures.json. Read build.mjs first.
 * Run: node scripts/host-seal/render-check/drive.mjs   (screenshots + results.json go to <OUT>)
 * Checks, per fixture and locale: switch off vs on (name hits in the Detective Guide and Evidence tabs), the notice,
 * persistence across reload, the fail-closed package, the slip package (no switch, ADR-0157 block kept, no detective block),
 * the host share page (HostAccess) on a 390 px viewport. A non-zero "on" count is NOT automatically a leak: a victim who
 * shares a surname with the culprit matches (the pt_detective fixture does); read the text before concluding anything.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { root, outDir, needles, countWord as count } from "../lib.mjs";

const base = `file://${outDir}`;
const fixtures = JSON.parse(fs.readFileSync(path.join(outDir, "fixtures.json"), "utf8"));
const ns = (fx) => (fixtures[fx].murderers || []).flatMap(needles);
// Sum per name part, whole words only (the count escapes regex characters, so never join names with "|").
const hits = (text, fx) => ns(fx).reduce((n, x) => n + count(text, x), 0);
const locale = (l) => JSON.parse(fs.readFileSync(path.join(root, `src/i18n/locales/${l}.json`), "utf8"));
const browser = await chromium.launch();
const results = [];
const log = (r) => { results.push(r); console.log(JSON.stringify(r)); };
const openTab = async (page, v) => { await page.locator(`[id$="-trigger-${v}"]`).first().click(); await page.waitForTimeout(250); };
const panel = (page) => page.locator('[role="tabpanel"][data-state="active"]').first().innerText();
const newCtx = async (lang, w, h) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([fx, l]) => { window.__FIXTURES__ = fx; try { localStorage.setItem("i18nextLng", l); } catch { /* storage blocked */ } }, [fixtures, lang]);
  return ctx;
};

async function owner(fixture, lang, shots = {}) {
  if (!fixtures[fixture]) return console.log("skip (no fixture)", fixture);
  const ctx = await newCtx(lang, 1280, 1000);
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  await page.goto(`${base}/index.html?mode=tab&fixture=${fixture}`);
  await page.waitForSelector('[role="tab"]', { timeout: 15000 });
  const isDet = fixtures[fixture].mystery_style !== "character";
  const loc = locale(lang), sc = loc.hostGuide.setupChoice;
  const row = { view: "owner", fixture, lang };
  await openTab(page, "host-guide");
  const guide = await panel(page);
  row.slipBlockPresent = guide.includes(sc.hostPlaysLabel.replace(/\*\*/g, ""));
  row.detectiveBlockPresent = guide.includes(sc.detectivePlaysLabel.replace(/\*\*/g, ""));
  row.rawKeyLeak = /hostGuide\.|hostSeal\.|detectivePlays/.test(guide);
  if (shots.guide) await page.screenshot({ path: path.join(outDir, shots.guide), fullPage: true });
  if (isDet) {
    await openTab(page, "inspector");
    row.script_off = hits(await panel(page), fixture);
    row.switchPresent = await page.locator("#host-seal-script").count();
    await page.locator("#host-seal-script").click(); await page.waitForTimeout(250);
    const on = await panel(page);
    row.script_on = hits(on, fixture);
    row.notice = (await page.locator("p.border").first().innerText().catch(() => "")).slice(0, 80);
    if (shots.sealed) await page.screenshot({ path: path.join(outDir, shots.sealed) });
    await openTab(page, "clues");
    row.clues_on = hits(await panel(page), fixture);
    await page.locator("#host-seal-clues").click(); await page.waitForTimeout(250); // off again
    row.clues_off = hits(await panel(page), fixture);
    await page.locator("#host-seal-clues").click(); await page.waitForTimeout(150); // on again, then reload
    await page.reload(); await page.waitForSelector('[role="tab"]'); await openTab(page, "inspector");
    row.persistedAfterReload = (await page.locator("#host-seal-script[data-state=checked]").count()) === 1;
  } else {
    await openTab(page, "inspector").catch(() => {});
    row.slipSwitchPresent = await page.locator("#host-seal-script").count();
  }
  row.pageErrors = errs;
  await ctx.close(); log(row);
}

async function host(fixture, lang, shot) {
  if (!fixtures[fixture]) return console.log("skip (no fixture)", fixture);
  const f = fixtures[fixture];
  const ctx = await newCtx(lang, 390, 900);
  await ctx.route("**/rest/v1/rpc/get_host_package*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    title: f.title, game_overview: f.game_overview, host_guide: "", materials: f.materials || "", preparation_instructions: "", timeline: "", hosting_tips: "",
    detective_script: f.detective_script, evidence_cards: f.evidence_cards, mystery_type: f.mystery_type, mystery_style: f.mystery_style, has_accomplice: f.has_accomplice, player_count: f.player_count }) }));
  const page = await ctx.newPage();
  await page.goto(`${base}/index.html?mode=host&fixture=${fixture}`);
  await page.waitForSelector('[role="tab"]', { timeout: 15000 });
  await page.locator('[role="tab"]').nth(1).click(); await page.waitForTimeout(300);
  const off = hits(await panel(page), fixture);
  await page.locator("#host-seal-access").click(); await page.waitForTimeout(300);
  const on = hits(await panel(page), fixture);
  if (shot) await page.screenshot({ path: path.join(outDir, shot) });
  await ctx.close(); log({ view: "host-link", fixture, lang, off, on });
}

await owner("en_detective", "en", { guide: "shot-en-guide.png", sealed: "shot-en-sealed.png" });
await owner("en_detective", "de", { guide: "shot-de-guide.png" });
await owner("en_detective", "ja");
await owner("sv_detective", "sv", { sealed: "shot-sv-sealed.png" });
await owner("pt_detective", "pt");
await owner("old_detective", "en", { sealed: "shot-old-sealed.png" });
await owner("en_slip", "en");
await owner("en_slip", "de");
await host("en_detective", "en", "shot-host-mobile.png");
await host("sv_detective", "sv");
await host("old_detective", "es");
await browser.close();
fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 1));
