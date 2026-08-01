# ADR-0048: Structural-integrity detector — escalate-only, distinct from content quality

- **Status:** Accepted
- **Date:** 2026-08-01

## Context

On 2026-07-30 a paid package — **"Death At The Velvet Viper: A New Orleans Speakeasy Tragedy"** (conversation `1572aac5-c103-40dc-aff0-0166154da70c`) — reached `generation_status = completed` while being broken in three ways at once:

- A **502 from the generation chain was stored verbatim as a character's `character_role`**: `<html>…<title>502 Bad Gateway</title>…</html>`.
- The package had **two `murderer` characters** (Thea *and* Theo Babineaux) for the same crime, in a detective/predetermined-style game that must have exactly one.
- The 30-person cast was **gender-duplicated with cross-wired content**: fifteen male/female pairs sharing a surname, and a row named "Grace Marchand" whose own background read `**Name:** Gus Marchand`.

Every ADR-0042 content-quality detector passed. The ADR-0041 identity-conflict detector passed. The 6-hourly health check reported green. This was a blind spot with a clear shape: **every detector we had reads prose; nothing read structure.** A `character_role` is an enum, a predetermined game has a murderer count, a character row has a name — these are checkable invariants, and none of them were checked.

A second, closely related finding surfaced while validating: `generation_status` is a `jsonb` column, but **23 of 144 package rows (17 of them `completed`, including Velvet Viper itself) store a jsonb *string* containing encoded JSON** rather than a jsonb object. For those rows `generation_status->>'status'` returns NULL, so the `(generation_status->>'status') = 'completed'` filter that every existing detector uses **silently skips them**. The motivating package was invisible to the entire detector suite twice over: wrong defect class *and* wrong status encoding.

## Decision

Add `list_packages_with_structural_defects(_since timestamptz DEFAULT '2026-04-01')` (migration `20260801_detect_structural_defects.sql`) — read-only, `SECURITY DEFINER`, `service_role` grant, mirroring the ADR-0041/0042 detector conventions. It returns one row per defective package with a `defects text[]` naming what was found. Wired into `.github/workflows/health-check.yml` as **check 11**, 🔴, 30-day rolling window, mirroring checks 6–9.

**It is ESCALATE-ONLY.** The ADR-0047 auto-remediation worker is deliberately not taught about it, and its handler allowlist is unchanged.

Four sub-checks shipped, each validated against **all history** (`_since '2000-01-01'`). Total: **6 packages flagged, zero false positives.**

| Sub-check | All-history hits | Verdict |
|---|---|---|
| `invalid_role` — `character_role` outside `(murderer, accomplice, suspect, redHerring)` | 3 | all genuine |
| `multiple_murderers` — >1 `murderer` in a non-`character`-style package | 2 | both genuine |
| `name_background_mismatch` — a row whose own `**Name:**` line names a different person | 0 | zero FP; verified by construction |
| `duplicated_cast` — two characters sharing a surname **and** a byte-identical `**Role:**` line | 1 | exactly the Velvet Viper package |

The flagged set:

- **"Murder At The Coronation: A Royal Scandal"** (paid, 2026-07-31) — a **live, unfixed 502-stored-as-`character_role`**, i.e. the motivating failure recurred the day after the incident and was found by this detector on its first run. Inside the 30-day window; will alert.
- **"Death At The Velvet Viper"** (paid, 2026-07-30) — `duplicated_cast`. Inside the window.
- **"Death At The Deadwood Saloon"** / **"Death At The Velvet Rose"** (paid, both 2026-04-22) — a legacy uppercase role vocabulary (`INNOCENT`/`MURDERER`/`GUILTY`/`ACCOMPLICE`). Genuine: app code compares against the lowercase set. Outside the window.
- **"The Night Of The Tide"** (paid, 2026-03-26, 2 murderers) and **"Death In The Spotlight"** (unpaid, 2026-04-21, **15** murderers). Outside the window.

`NULL` `character_role` is explicitly **not** flagged — 492 rows across 42 character-style (random-slip) packages legitimately have no role.

The function normalises **both** `generation_status` encodings, so it sees the 17 completed packages the existing filter misses.

### Sub-checks investigated and dropped

Same discipline as the ADR-0042 meta-leak tightening and the evidence-spoiler exclusion — **drop a sub-check rather than ship noise.**

- **`cast_count_mismatch`** (character rows vs `conversations.player_count`) — **35 packages** across history. `player_count` is the request-time ask, not a contract: casts legitimately run ±1 for victim/host handling (ADR-0038 fixes cast size at generation), and the 2025 backlog is full of partial legacy rows. Signal-free. **Dropped.**
- **Raw duplicate-surname** as a gender-duplication proxy — flags every legitimate family mystery (the "Crane" package et al), exactly as the task brief warned. **Replaced** by `duplicated_cast`, which additionally requires an identical `**Role:**` line. Real families share a surname but not a job description.
- **Raw duplicate-role-line** (without the surname requirement) — 3 packages, 2 of them false positives where a shared role is the premise ("5th Year Hufflepuff Student" across a Hogwarts cast; two professors of the same subject). **Not shipped alone.**
- **Naive `character_name` vs `**Name:**`** — **18 packages**, almost all benign: the gender-flexible dual-name convention (`Jordan/Jordana Vance` → `Jordan Vance`), honorifics (`The Honourable Tiggy Fortescue-Willoughby`), parenthetical aliases (`Reese Hart (also goes by Reagan Hart)`), and nickname/formal variance (Joe/Joseph, Bill/William, Emily/Emilia). **Tightened, not shipped raw** — see below.

### How `name_background_mismatch` was tightened

A row is flagged only when the normalised names differ, **neither is a substring of the other** (kills honorifics, parenthetical aliases and truncations), **neither side uses the `A/B Surname` convention**, and one of:

- **(a)** the surnames differ outright → a foreign person bled in; or
- **(b)** the background's name is the name of **another character row in the same package** → unambiguous cross-wiring.

(b) is the Velvet Viper signature exactly: the "Grace Marchand" row whose background read `**Name:** Gus Marchand`, while a separate "Gus Marchand" row existed. That package was repaired in place on 2026-07-31, before this detector existed, so the rule returns 0 rows today. It is retained because it is **zero-FP across all history** and is the only rule that catches this failure mode; it is verified by construction against the original data rather than by a live hit.

## Rationale

- **Structural integrity is a different failure class from content quality, and needs its own checks.** Content detectors ask "is this prose wrong?"; these ask "is this package's shape valid?". A 502 in an enum column is not a quality problem, and no amount of prose-reading finds it. Naming the class makes the gap closable.
- **Escalate-only is forced by the defects themselves, not by caution.** You cannot synthesise the correct `character_role` from a 502 body, choose which of two murderers the plot intended, or un-cross-wire a 30-person cast. Regeneration is the only remedy. Teaching the ADR-0047 worker to touch these would mean inventing content — precisely the content-destruction failure its own eval blocked on. The worker's escalate-only set already includes judgment-heavy classes; this is the same reasoning applied to unrepairable ones.
- **It already earned its place.** On first execution it found a live, unfixed paid package (Coronation, 2026-07-31) with the exact defect that motivated it — a recurrence nobody had noticed. A detector that catches a live customer-facing defect on day one is not speculative.
- **`invalid_role` is the highest-value rule and nearly free.** An enum check has no false-positive surface: either the value is in the vocabulary or it isn't. It generalises beyond 502s to any truncated or garbled upstream response landing in that column.
- **Dropping two of the five candidate sub-checks preserves the alert channel.** Wiring `cast_count_mismatch` would have added 35 permanent historical rows and a steady false-alarm rate; the health check's credibility is the asset being protected (ADR-0042).

## Alternatives Considered

1. **Extend an existing ADR-0042 detector instead of adding a new function.** Rejected: the content detectors share a "scan prose for a regex" shape and a per-defect return signature. Structural checks need per-package aggregation across several unrelated invariants, and — crucially — a *different escalation policy*. A single function with a `defects[]` array keeps the escalate-only boundary legible at the call site.
2. **Teach the auto-remediation worker to repair structural defects.** Rejected on the merits above; also reverses the ADR-0047 eval's core finding that mechanical fixes must never fabricate content.
3. **Ship all five candidate sub-checks and tune later.** Rejected — the ADR-0042 evidence-spoiler experience is the precedent: a noisy detector degrades every other alert in the same channel, and "tune later" reliably becomes "mute permanently".
4. **Fix the `generation_status` double-encoding as part of this change.** Rejected for scope: it touches 23 rows and every existing detector's filter, and a data migration deserves its own verified pass. Recorded as an open follow-up (below) rather than bundled in — but this function tolerates both encodings so it is not blocked by it.
5. **Regenerate the flagged packages now.** Out of scope for this task (build + commit only); the Coronation package needs a decision from Jonathan since it is paid and recent.

## Consequences

- The health check reports an 11th row and **will alert immediately**: 2 packages are inside the 30-day window (Coronation 🔴 live 502; Velvet Viper `duplicated_cast`). This is correct — both are real, paid, and unresolved. The alert will persist until they are regenerated or age out, which is the intended escalate-only behaviour.
- The four pre-2026-07 true positives sit outside the window and do not alert: a known, logged backlog, not auto-fixed.
- **`name_background_mismatch` currently has no live positive.** It is retained on zero-FP + by-construction grounds; if it is still silent in six months, revisit whether the cross-wire form is reachable at all.
- **Open follow-up — `generation_status` double-encoding.** 23 rows (17 `completed`) are invisible to the `->>'status'` filter used by the ADR-0016/0041/0042 detectors *and* by the ADR-0047 worker's window. Those detectors were validated against a silently reduced corpus. Logged to `00_INBOX` with `status: open`.
- **Open follow-up — detector RPC grants.** `CREATE FUNCTION` leaves `EXECUTE` with `PUBLIC`, so `anon`/`authenticated` can call every `list_packages_with_*` detector, which returns paid package titles and ids. This function mirrors its siblings rather than diverging unilaterally; the whole family should be revoked together (cf. ADR-0032). Logged to `00_INBOX` with `status: open`.
- **Vault sync is pending, not done.** The Obsidian vault was not reachable from this session's sandbox. The ADR copy and changelog entry are staged in `temp-files/vault-sync-pending/` with the correct frontmatter and destination paths; they must be copied manually.

## Discussion

The sharpest question was whether the gender-duplication check could be made safe at all. The task brief flagged it as the risky one — legitimate family mysteries share surnames, and the "Crane" package is the standing counter-example. The naive surname rule is indeed unusable. But the *content* of the Velvet Viper duplication is what makes it a defect and not a family: the paired characters weren't relatives, they were the same character twice with the gender flipped, and that shows up as a **byte-identical `**Role:**` line** ("Head Chef at Fancy's Supper Club" appearing under both Grace and Gus Marchand). Conjoining surname-match with role-line-match isolates exactly one package across all history and leaves every family mystery alone. Neither predicate is usable on its own; together they are precise.

The second judgement call was what to do with `name_background_mismatch` once the naive version proved to be mostly detecting a *product feature* — the `Jordan/Jordana` gender-flexible naming convention is intentional, and the background legitimately picks one. The temptation was to drop it entirely for having no live positive. It was kept because the tightened cross-wire form is a different rule with a different error surface: it does not ask "do these names differ" (they often should) but "does this row's background belong to another row" (it never should). That distinction is the whole difference between noise and signal here.

Worth recording as a lesson: **the incident was invisible for two independent reasons, and only one of them was the missing detector.** Building check 11 without noticing the `generation_status` encoding split would have produced a detector that still couldn't see its own motivating package. Validating against all history — rather than trusting the filter every sibling uses — is what surfaced it.

## Key Files

- `supabase/migrations/20260801_detect_structural_defects.sql` — the detector, with the full validation record in comments
- `.github/workflows/health-check.yml` — check 11 (escalate-only) + status-table row
- `docs/adr/0042-content-quality-detectors-and-generation-guardrails.md` — the content-quality companion this extends
- `docs/adr/0047-closed-loop-auto-remediation.md` — the worker deliberately left untouched
- `docs/adr/0041-detect-cross-character-identity-contamination.md` — the original read-only-detector pattern
