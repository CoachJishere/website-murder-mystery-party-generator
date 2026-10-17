// Run: node --experimental-strip-types scripts/__tests__/portugueseRegion.test.mjs
import assert from "node:assert/strict";
import { detectPortugueseRegion as d } from "../../src/lib/portugueseRegion.ts";
const t = (n, fn) => { fn(); console.log("ok  ", n); };

t("Portugal and the European-norm countries are pt-PT", () => {
  assert.equal(d(["pt-PT", "en"]), "pt-PT");
  assert.equal(d(["pt_pt"]), "pt-PT");
  assert.equal(d(["en-GB", "pt-AO"]), "pt-PT");
  assert.equal(d(["PT-MZ"]), "pt-PT");
});
t("Brazil is pt-BR", () => {
  assert.equal(d(["pt-BR", "en-US"]), "pt-BR");
  assert.equal(d(["pt_br"]), "pt-BR");
});
t("a bare pt, no Portuguese, or nothing says nothing (the server decides)", () => {
  assert.equal(d(["pt"]), null);
  assert.equal(d(["en-US", "es-ES"]), null);
  assert.equal(d([]), null);
  assert.equal(d(undefined), null);
  assert.equal(d(null), null);
});
t("the first explicit Portuguese entry wins, a bare pt before it is skipped", () => {
  assert.equal(d(["pt", "pt-BR"]), "pt-BR");
  assert.equal(d(["pt-BR", "pt-PT"]), "pt-BR");
  assert.equal(d(["en", "pt", "pt-PT"]), "pt-PT");
});
t("a language that merely starts with pt is not Portuguese", () => {
  assert.equal(d(["ptolemaic"]), null);
});
console.log("portugueseRegion tests passed");
