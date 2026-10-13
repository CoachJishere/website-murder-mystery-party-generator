// Run: node --experimental-strip-types supabase/functions/_shared/rosterRenames.test.mjs
import assert from "node:assert/strict";
import * as R from "./rosterExtraction.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };

// Real shape from "Champagnens Skygge" (conversation df706106): full list approved, then a two-line patch after a user rename request.
const names = ["Johannes \"Jazz-Jo\" Møller", "Elise Thorvaldsen", "Kaptajn Villads Brandt", "Greve Rudolph af Skovgaard", "Agnes Weber", "Dr. Absalon Krag", "Ingrid Castenskiold", "Officer Helmer Aggerholm", "Clara Dam", "Konsul Viggo Eskildsen", "Marguerite \"Margot\" Lacroix", "Holger Fjeldsted", "Baronesse Ulla von Hadeln", "Thorkild Ravn", "Bedstemor Signe Holm", "Emil Sachs", "Fru Dagny Castenskiold"];
const descs = names.map((n, i) => `Beskrivelse nummer ${i + 1} for ${n.split(" ")[0]}: en lang og særegen tekst om personens baggrund, motiver og forhold i klubben, så den kan genkendes.`);
descs[4] = "Klubbens bogholder, pertentlig og nervøs med en vane med at tælle højlydt, når hun er stresset; hun er den eneste, ud over Fru Lindqvist, der kendte den præcise værdi af lageret.";
descs[14] = "Overraskende energisk ældre dame, der ejer bygningen, klubben lejer sig ind i, med en skarp forretningssans og en svaghed for god champagne; har tidligere truet med at opsige lejemålet, hvis hun ikke fik en større andel af overskuddet.";
const list = names.map((n, i) => `${i + 1}. **${n}** – ${descs[i]}`).join("\n");
const snapshot = { id: "S", role: "assistant", content: `Her kommer det fulde koncept:\n\n## Karakterliste (17 karakterer)\n\n${list}\n\n## Forbrydelsesmetode\n\nTekst.` };
const userMsg = { id: "U", role: "user", content: "Agnes Weber efternavn skal ændres. Ændre Bedstemor Signe Holm, så hun ikke er en Bedstemor." };
const patch = { id: "P", role: "assistant", content: `Fint, begge rettelser er nemme!\n\n5. **Agnes Munk** – ${descs[4]}\n\n15. **Signe Holm** – ${descs[14]}\n\nResten af konceptet forbliver uændret.` };

const roster = R.extractRosterFromMessage(snapshot.content);

t("fixture parses to the 17-character roster", () => assert.equal(roster.length, 17));

t("the two-line patch renames exactly Agnes Weber and Bedstemor Signe Holm", () => {
  const r = R.applyLaterRenames(roster, [snapshot, userMsg, patch], "S");
  assert.deepEqual(r.renames, [{ from: "Agnes Weber", to: "Agnes Munk" }, { from: "Bedstemor Signe Holm", to: "Signe Holm" }]);
  assert.equal(r.roster.length, 17);
  assert.equal(r.roster[4].name, "Agnes Munk"); assert.equal(r.roster[14].name, "Signe Holm");
  assert.equal(r.roster[0].name, roster[0].name);
  assert.equal(roster[4].name, "Agnes Weber"); // input is not mutated
});

t("no later messages, or no snapshot id: nothing changes", () => {
  assert.deepEqual(R.applyLaterRenames(roster, [snapshot], "S").renames, []);
  assert.deepEqual(R.applyLaterRenames(roster, [snapshot, patch], null).renames, []);
  assert.deepEqual(R.applyLaterRenames(roster, [snapshot, patch], "missing").renames, []);
});

t("a message BEFORE the snapshot never counts", () => {
  assert.deepEqual(R.applyLaterRenames(roster, [patch, snapshot], "S").renames, []);
});

t("a new line whose description is different is a new person, not a rename", () => {
  const other = { id: "O", role: "assistant", content: "5. **Agnes Munk** – En helt anden person: en sanger fra Paris der aldrig har set et regnskab, men elsker blomster og katte." };
  assert.deepEqual(R.applyLaterRenames(roster, [snapshot, other], "S").renames, []);
});

t("two competing new names for the same person are ambiguous and change nothing", () => {
  const two = { id: "T", role: "assistant", content: `Forslag:\n5. **Agnes Munk** – ${descs[4]}\n5. **Agnes Berg** – ${descs[4]}` };
  assert.deepEqual(R.applyLaterRenames(roster, [snapshot, two], "S").renames, []);
});

t("a new name that is already another character's name is refused", () => {
  const clash = { id: "C", role: "assistant", content: `5. **Clara Dam** – ${descs[4]}` };
  assert.deepEqual(R.applyLaterRenames(roster, [snapshot, clash], "S").renames, []);
});

t("a bold-only patch line (no number) renames by shared word plus same description", () => {
  const bold = { id: "B", role: "assistant", content: `**Agnes Munk** – ${descs[4]}` };
  assert.deepEqual(R.applyLaterRenames(roster, [snapshot, bold], "S").renames, [{ from: "Agnes Weber", to: "Agnes Munk" }]);
});

console.log("roster rename tests passed");
