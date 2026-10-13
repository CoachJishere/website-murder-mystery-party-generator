// Run: node --experimental-strip-types supabase/functions/review-package-quality/roster-reconcile.test.mjs
import assert from "node:assert/strict";
import * as R from "./roster-reconcile.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };

const NAMES = ["Johannes 'Jazz-Jo' Møller", "Elise Thorvaldsen", "Kaptajn Villads Brandt", "Agnes Munk", "Signe Holm", "Emil Sachs", "Clara Dam", "Thorkild Ravn"];
const matrix = (names, victim = "Fru Augusta Lindqvist") => {
  const rows = names.slice(1).map((n, i) => ({ character1: names[i], character2: n, relationship: "x" }));
  rows.push({ character1: names[0], character2: victim === null ? names[2] : victim });
  return JSON.stringify({ relationshipMatrix: rows.filter((r) => victim !== null || true), victimProfile: { name: victim ?? "x", isPlayableCharacter: false } }, null, 2) + "\n{" + JSON.stringify({ more: { "a": 1 } }).slice(1);
};
// every sheet mentions a few neighbours by their (new) names
const sheet = (name, others) => ({ name, text: `Jeg er ${name}. ` + others.map((o) => `Jeg har talt med ${o}.`).join(" ") });

t("matrixNames reads character1/2 and the victim, handles two concatenated JSON documents and escapes", () => {
  const { names, victim } = R.matrixNames(matrix(NAMES));
  assert.ok(names.includes("Agnes Munk") && names.includes("Signe Holm") && names.includes("Fru Augusta Lindqvist"));
  assert.equal(victim, "Fru Augusta Lindqvist");
  const esc = R.matrixNames('{"relationshipMatrix":[{"character1":"Ann \\"Bee\\" Cole","character2":"Zed"}]}');
  assert.deepEqual(esc.names.sort(), ['Ann "Bee" Cole', "Zed"]);
});

t("the Champagnens Skygge shape: both late renames are found, with the evidence rule", () => {
  const mc = matrix(NAMES) + ' "userRequirements": ["Agnes Weber skal have nyt efternavn: det er ændret til Agnes Munk.", "Bedstemor Signe Holm skal ikke være en bedstemor: hun hedder nu Signe Holm."]';
  const sheets = [
    sheet("Johannes 'Jazz-Jo' Møller", ["Agnes Munk", "Signe Holm", "Emil Sachs"]),
    sheet("Elise Thorvaldsen", ["Signe Holm", "Clara Dam"]),
    sheet("Kaptajn Villads Brandt", ["Agnes Munk", "Signe Holm"]),
    sheet("Agnes Weber", ["Clara Dam"]),
    sheet("Bedstemor Signe Holm", ["Agnes Munk"]),
    sheet("Emil Sachs", ["Agnes Munk", "Signe Holm"]),
    sheet("Clara Dam", ["Agnes Munk"]),
    sheet("Thorkild Ravn", ["Signe Holm", "Agnes Munk"]),
  ];
  const r = R.planRenames(mc, sheets);
  assert.deepEqual(r.renames.map((x) => [x.from, x.to]).sort(), [["Agnes Weber", "Agnes Munk"], ["Bedstemor Signe Holm", "Signe Holm"]]);
  assert.equal(r.unresolved, null);
});

t("renameIsDocumented needs the old name near a SEPARATE occurrence of the new name", () => {
  assert.ok(R.renameIsDocumented("Agnes Munk (tidligere Agnes Weber, efternavnet er ændret)", "Agnes Weber", "Agnes Munk"));
  assert.ok(R.renameIsDocumented("Signe Holm (tidligere 'Bedstemor Signe Holm', titlen er fjernet)", "Bedstemor Signe Holm", "Signe Holm"));
  assert.ok(!R.renameIsDocumented("Bedstemor Signe Holm er ejer af huset.", "Bedstemor Signe Holm", "Signe Holm")); // new name only inside the old one
  assert.ok(!R.renameIsDocumented("Agnes Weber her. " + "x".repeat(400) + " Agnes Munk der.", "Agnes Weber", "Agnes Munk")); // too far apart
  assert.ok(!R.renameIsDocumented("Ranger Pete Thistlewood is the ranger.", "Ranger Petre", "Ranger Pete Thistlewood")); // old name absent
});

t("an undocumented difference (generator invented a fuller name) is unresolved, not renamed, even with strong mention counts", () => {
  const names = ["Ranger Pete Thistlewood", "Camper Ruby Alvarez", "Chef Gus", "Troop Leader Marcy", "Sheriff Bobbi Jo"];
  const sheets = [
    sheet("Ranger Petre", ["Chef Gus"]), sheet("Camper Ruby", ["Chef Gus"]), sheet("Chef Gus", ["Ranger Pete Thistlewood", "Camper Ruby Alvarez"]),
    sheet("Troop Leader Marcy", ["Ranger Pete Thistlewood", "Camper Ruby Alvarez"]), sheet("Sheriff Bobbi Jo", ["Ranger Pete Thistlewood", "Camper Ruby Alvarez"]),
  ];
  const r = R.planRenames(matrix(names), sheets);
  assert.deepEqual(r.renames, []);
  assert.ok(r.unresolved);
});

t("a clean package (sheet names equal matrix names) yields nothing", () => {
  const sheets = NAMES.map((n) => sheet(n, ["Emil Sachs"]));
  const r = R.planRenames(matrix(NAMES), sheets);
  assert.deepEqual(r, { renames: [], unresolved: null });
});

t("a non-playable victim named in the matrix is not a rename (Lady Bovine shape)", () => {
  const names = ["Alex Nash", "Vivienne Cross", "Armand Devereaux", "Lily Chen", "Marcus Bellamy"];
  const mc = matrix(names, "Vivienne Ashford");
  const sheets = names.map((n) => sheet(n, ["Lily Chen", "Vivienne Cross"]));
  assert.deepEqual(R.planRenames(mc, sheets), { renames: [], unresolved: null });
});

t("not enough evidence is reported as unresolved, never planned (truncated name, S'more shape)", () => {
  const names = ["Ranger Pete Thistlewood", "Camper Ruby Alvarez", "Chef Gus", "Troop Leader Marcy", "Sheriff Bobbi Jo"];
  const sheets = [
    sheet("Ranger Petre", ["Chef Gus"]), sheet("Camper Ruby", ["Chef Gus"]), sheet("Chef Gus", ["Sheriff Bobbi Jo"]),
    sheet("Troop Leader Marcy", ["Chef Gus"]), sheet("Sheriff Bobbi Jo", ["Ranger Pete"]),
  ];
  const r = R.planRenames(matrix(names), sheets);
  assert.deepEqual(r.renames, []);
  assert.ok(r.unresolved && r.unresolved.sheetOnly.includes("Ranger Petre"));
});

t("an old name still used by other sheets blocks the rename", () => {
  const names = ["Anna Berg", "Bo Lund", "Cara Dahl", "Dan Eng"];
  const mc = matrix(names, "Victor");
  const sheets = [sheet("Anna Bergstrom", ["Bo Lund", "Cara Dahl"]), sheet("Bo Lund", ["Anna Bergstrom", "Anna Berg"]),
    sheet("Cara Dahl", ["Anna Bergstrom", "Anna Berg"]), sheet("Dan Eng", ["Anna Berg", "Anna Bergstrom"])];
  assert.deepEqual(R.planRenames(mc, sheets).renames, []);
});

t("two sheets that could both match one matrix name are refused", () => {
  const names = ["Anna Berg", "Bo Lund", "Cara Dahl", "Dan Eng"];
  const sheets = [sheet("Anna Berg Sr", ["Bo Lund", "Cara Dahl"]), sheet("Anna Berg Jr", ["Bo Lund", "Cara Dahl"]), sheet("Bo Lund", ["Anna Berg"]), sheet("Cara Dahl", ["Anna Berg"]), sheet("Dan Eng", ["Anna Berg"])];
  // "Anna Berg" itself is not a sheet name, both Anna sheets share words with it
  assert.deepEqual(R.planRenames(matrix(names, "Victor"), sheets).renames, []);
});

t("dual-name sheets (Osric/Osryth) match either half and are never renamed", () => {
  const names = ["Osric", "Bo Lund", "Cara Dahl", "Dan Eng"];
  const sheets = [sheet("Osric/Osryth", ["Bo Lund"]), sheet("Bo Lund", ["Osric"]), sheet("Cara Dahl", ["Osric"]), sheet("Dan Eng", ["Osric"])];
  assert.deepEqual(R.planRenames(matrix(names, "Victor"), sheets), { renames: [], unresolved: null });
});

t("too little structure (fewer than 3 matrix names) plans nothing", () => {
  assert.deepEqual(R.planRenames("{}", [sheet("A B", []), sheet("C D", []), sheet("E F", [])]), { renames: [], unresolved: null });
});

t("replaceName replaces every whole-string occurrence and counts them", () => {
  const r = R.replaceName("Agnes Weber her. Agnes Weber der. Agnes Weberg.", "Agnes Weber", "Agnes Munk");
  assert.equal(r.n, 3); // the substring inside "Agnes Weberg" is also replaced: callers only use full names that other sheets never contain
  assert.equal(R.replaceName("x", "", "y").n, 0);
});

console.log("roster-reconcile tests passed");
