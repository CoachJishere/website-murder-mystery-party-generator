// Run: node --experimental-strip-types supabase/functions/_shared/readyEmail.test.mjs
import assert from "node:assert/strict";
import * as E from "./readyEmail.ts";
import { KNOWN_LOCALES } from "./email-i18n.ts";
import { detectLanguage, languageSample } from "./languageDetect.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };

t("every known locale has a ready-email translation", () => assert.deepEqual([...E.READY_EMAIL_LOCALES].sort(), [...KNOWN_LOCALES].sort()));

t("the English wording is unchanged from before (only escaping was added)", () => {
  const r = E.buildReadyEmail("en", { name: "Anna", title: "The Night", conversationId: "abc" });
  assert.equal(r.subject, "Your Mystery is Ready!");
  assert.ok(r.html.includes("Your Mystery Has Been Generated!") && r.html.includes('Hi Anna, great news! Your murder mystery "The Night" is ready and waiting for you.') && r.html.includes("View Your Mystery"));
  assert.ok(r.html.includes('href="https://www.mysterymaker.party/mystery/abc"') && r.html.includes('<html lang="en">'));
});

t("the Danish email is Danish end to end and carries lang=da", () => {
  const r = E.buildReadyEmail("da", { name: "jla", title: "Champagnens Skygge", conversationId: "df706106" });
  assert.equal(r.subject, "Dit mysterium er klar!");
  assert.ok(r.html.includes("Hej jla, gode nyheder!") && r.html.includes("Se dit mysterium") && r.html.includes('<html lang="da">'));
  assert.ok(!/Your Mystery|great news/.test(r.html));
});

t("every locale renders subject, heading, body and button with no English left except the brand", () => {
  for (const l of E.READY_EMAIL_LOCALES) {
    const r = E.buildReadyEmail(l, { name: "Sam", title: "Titel", conversationId: "c1" });
    assert.ok(r.subject && r.html.includes("Sam") && r.html.includes("Titel") && r.html.includes(`<html lang="${l}">`), l);
    if (l !== "en") assert.ok(!/Your Mystery|great news|View Your/i.test(r.html), l);
  }
});

t("no name gives a greeting-free sentence; name and title are HTML-escaped", () => {
  const r = E.buildReadyEmail("fr", { name: null, title: 'A <b>"x"</b> & y', conversationId: "c" });
  assert.ok(r.html.includes("Bonne nouvelle !") && !r.html.includes("Bonjour"));
  assert.ok(r.html.includes("A &lt;b&gt;&quot;x&quot;&lt;/b&gt; &amp; y") && !r.html.includes("<b>"));
  assert.ok(E.buildReadyEmail("de", { name: "<i>", title: "t", conversationId: "c" }).html.includes("&lt;i&gt;"));
});

t("locale choice: the package text wins, then the profile, then English", () => {
  assert.equal(E.pickReadyLocale("da", "en"), "da");
  assert.equal(E.pickReadyLocale(null, "es"), "es");
  assert.equal(E.pickReadyLocale("xx", "en"), "en");
});

t("detectLanguage (shared) recognises Danish and English introductions and refuses a tiny sample", () => {
  const da = "God aften, alle sammen. Jeg hedder Agnes og fører regnskaberne her i Den Gyldne Note. Det er mig, der tæller kassen, og jeg har ikke noget at skjule. Jeg vil gerne have, at sagen bliver opklaret, og jeg kan ikke lide, at nogen tror, at jeg er skyldig. Spørg mig om tal, så skal jeg nok svare, men også selv hvis det er sent.";
  const en = "Good evening, everyone. My name is Agnes and I keep the books here at the club. It was me that counted the cash, and I have nothing to hide from you. I would like this matter to be solved, and I do not like that they think this was my doing. Ask me about numbers and I will answer what I know.";
  assert.equal(detectLanguage(da), "da"); assert.equal(detectLanguage(en), "en");
  assert.equal(detectLanguage("kort tekst"), null);
  assert.ok(languageSample([{ introduction: "a".repeat(900) }, { introduction: "b" }]).length < 1500);
});

console.log("readyEmail tests passed");
