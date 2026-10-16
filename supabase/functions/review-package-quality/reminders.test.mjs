// Run: node --experimental-strip-types supabase/functions/review-package-quality/reminders.test.mjs
import assert from "node:assert/strict";
import * as R from "./reminders.ts";

const t = (n, fn) => { fn(); console.log("ok  ", n); };
const C68 = { kind: "child", version: 68, effective_from: "2026-10-16T08:09:49+00:00" };
const pk = (created_at, style = "detective", released = "2026-10-17T00:00:00Z") => ({ created_at, mystery_style: style, quality_review_released_at: released });

t("no reminder before Child68 has two released detective purchases", () => {
  const base = { history: [C68], sent: new Set() };
  assert.deepEqual(R.dueReminders({ ...base, pkgs: [] }), []);
  assert.deepEqual(R.dueReminders({ ...base, pkgs: [pk("2026-10-17T10:00:00Z")] }), []);
  // before the import, a slip package, an unreleased package do not count
  assert.deepEqual(R.dueReminders({ ...base, pkgs: [pk("2026-10-17T10:00:00Z"), pk("2026-10-16T07:00:00Z"), pk("2026-10-18T10:00:00Z", "character"), pk("2026-10-18T11:00:00Z", "detective", null)] }), []);
  assert.deepEqual(R.dueReminders({ history: [], pkgs: [pk("2026-10-17T10:00:00Z"), pk("2026-10-18T10:00:00Z")], sent: new Set() }), []);
});

t("two released detective purchases after the import trigger the Parent88 reminder, once", () => {
  const pkgs = [pk("2026-10-17T10:00:00Z"), pk("2026-10-18T10:00:00Z")];
  const r = R.dueReminders({ history: [C68], pkgs, sent: new Set() });
  assert.equal(r.length, 1); assert.equal(r[0].key, "parent88_import");
  assert.ok(r[0].subject.includes("Parent88") && r[0].body.includes("Parent88 (Contents Of The Hidden Thing)") && r[0].body.includes("Parent88 imported") && r[0].body.includes("Parent87"));
  assert.ok(r[0].body.includes("2 released detective purchases"));
  assert.deepEqual(R.dueReminders({ history: [C68], pkgs, sent: new Set(["parent88_import"]) }), [], "already sent");
});

t("no reminder once Parent88 is logged as imported", () => {
  const pkgs = [pk("2026-10-17T10:00:00Z"), pk("2026-10-18T10:00:00Z"), pk("2026-10-19T10:00:00Z")];
  assert.deepEqual(R.dueReminders({ history: [C68, { kind: "parent", version: 88, effective_from: "2026-10-19T12:00:00+00:00" }], pkgs, sent: new Set() }), []);
  assert.equal(R.detectivePurchasesSince(pkgs, C68.effective_from), 3);
});
console.log("reminders tests passed");
