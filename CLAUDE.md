# Murder Mystery Party Generator — Claude Code Instructions

## Shorthand Commands

- **"sweep"** = Run a coherence sweep on a pasted purchase notification. Trigger: Jonathan pastes a purchase notification into a fresh session and says "sweep" — no other setup required, this file is auto-loaded. Branch on the notification's header/fields:

  **"New Purchase!" (a new mystery)** → New-Purchase Coherence Sweep (ADR-0103). Conversation ID is the only field actually needed.
  1. Resolve `package_id`/`mystery_style`/`player_count`/`has_accomplice`/language from the `conversation_id`.
  2. Note whether the package predates or postdates the 2026-08-11 blanket Sonnet 5 upgrade (ADR-0074) — pre-upgrade gets extra scrutiny, but don't skip post-upgrade.
  3. Run `list_packages_with_meta_text_leak`, `list_packages_with_victim_mismatch`, `list_packages_with_unresolved_victim_name`, and `list_packages_with_dangling_quote_mark` scoped to this package — a clean result is a data point, not proof (all have known blind spots, see ADR-0103; the third checks whether `master_context`'s victim name still contains "/" — a real regression only if the package predates ADR-0107's fix or the fix wasn't actually imported yet, since ADR-0107 deliberately didn't rewrite `master_context` on already-fixed historical packages). The fourth (`list_packages_with_dangling_quote_mark`, ADR-0103 Addendum 55) catches an unmatched trailing quote character in `introduction`/`final_statement`/`reveal_confession_guilty`/`reveal_confession_accomplice`/`final_innocent` — traced to the LAST field in 8 Make.com generation call sites picking up a stray quote from an ambiguous JSON-formatting instruction; fixed at the source in blueprint v44 (imported 2026-09-25), so this should trend toward zero going forward — a live hit post-v44 would mean the prompt fix didn't fully land and is worth a fresh look.
  4. Manually cross-check the victim's name across `game_overview`, `detective_script`, and 3-4 characters' own background/relationships text. Any mismatch is high-severity by default.
  5. Read the full `detective_script` for leaked brackets/placeholders, garbled sentences, and — for slip-style (`mystery_style = 'character'`) games — confirm any `[MURDERER NAME]`-style bracket is the legitimate host-fill-in convention, not a leak.
  6. Read every character's full content (relationships, secrets, round scripts, accusations) for leaked authoring notes, self-directed questions, dangling references to removed characters, garbled text, and cross-field factual contradictions against `master_context`/`detective_script`/`evidence_cards` — **in the package's actual language**, not just English patterns. **Widened from a 2-3 character spot-check to the full cast (ADR-0103 Addendum 56, 2026-09-26).** The cross-field-mismatch bugs found in this corpus (secret inversions, wrong evidence ownership, wrong amounts/titles — see below) have all been caught by manually reading content, and a sampled check leaves most of a typical 11-14+ character cast with zero cross-field scrutiny. Jonathan's call when offered the choice between widening manual coverage vs. building a paid LLM-judge semantic-consistency tool: widen manual coverage — the real gap was sampling, not a missing capability, so it doesn't justify new ongoing spend.
     - **If the language has a formal/informal address distinction** (German Sie/du, French tu/vous, Spanish tú/usted, Portuguese tu/você, Italian tu/lei, Dutch je/u), check every character's round/final branch-selection headers use the *same* register as that character's own introduction, AND check the detective's own voice (backstory, opening statement, all rounds, accusations, reveal) uses one consistent register throughout, including when directly addressing the murderer and accomplice at the reveal. Found twice now — ADR-0103 Addendum 13 (character-header drift, "Tod Auf Der Alm 3000") and Addendum 56 (detective cross-suspect drift, "El Zasca Final": informal `eres tú` for the murderer mid-reveal while everything else, including the accomplice two sentences later, used formal `usted`). Jonathan's call: build the structural fix rather than keep patching by hand — shipped 2026-09-26 as two new blueprint versions, `MM Live - Parent70 (Register Consistency Fix)` (detective's own register) and `MM Live - Child (Unified)45-RegisterConsistencyFix` (per-character register). **Check whether these have been imported into Make.com yet** (ask Jonathan or check for a newer numbered version in `temp-files/`) — if not yet imported, keep checking manually as before; if imported, a live hit means the structural fix didn't fully land and is worth a fresh look, same as the dangling-quote-mark detector's post-v44 treatment.
     - **Check whether fields disagree with each other on a concrete fact.** Instances found so far: a character's `secret`/`secrets` reversing who-did-what-to-whom versus their own `background`/round scripts/`master_context`'s `howVictimWrongedThem` (Addendum 33, "The Last Supper At Ravenscroft Manor"); a piece of evidence's ownership/origin in `detective_script` contradicting `evidence_cards` and `master_context`'s `namedItems` (Addendum 56, "The Last Lesson Of Professor Vaingloryus" — the Round 2 ledger was framed as the victim's own confession in `detective_script` but was actually a different character's grievance record per the canonical `namedItems` entry); a specific name, amount, or title disagreeing across fields (Addenda 47/48). This is a semantic contradiction inside otherwise well-formed prose, not a string pattern, so no detector can reliably catch it — catching it requires actually reading the content and cross-referencing against `master_context`. **Decided 2026-09-26: no LLM-judge tool for this** — see the full-cast coverage widening above; that's the fix for this bug class too, not a paid semantic-consistency check.
     - **Wrong grammatical person / self-reference in a character's guilty/accomplice/innocent/reveal_confession branches** (a character's own script narrated in third person, e.g. "Arthur spreads his hands... he says...", or a character naming themselves in the third person mid-confession, e.g. "what Korra had done" inside Korra's own reveal_confession_accomplice) — now covered by a real, corpus-validated detector: `narration_person_mismatch` inside `package_completion_blocking_defects()` / `list_packages_with_narration_person_mismatch()` (ADR-0103 Addendum 45). **Third-person narration alone is NOT a defect** — a large fraction of this corpus legitimately uses a stage-direction-plus-quoted-dialogue style (e.g. `Joe's shoulders drop... 'Okay,' he says. 'I did it.'`); the real signal is a character's own baseline branch (`*_innocent`/`*_script`/`final_statement`) proving they write first person while a *sibling* branch opens third-person with zero quotable dialogue. Don't hand-flag plain third-person prose during a manual sweep pass — run the detector, and if it or a manual read finds a genuine case, fix it the same way Addendum 45 did (regenerate via `regenerate-child-content`, now fixed at the prompt level too).
  7. Run `package_completion_blocking_defects()` for genuinely missing content.
  8. Found something → fix it, re-verify, CHANGELOG entry + an addendum to **ADR-0103** (not ADR-0098 — different incident). Clean → report in chat only, no permanent document for a routine "nothing found."
  - **When a found bug traces to a genuinely fixable prompt/instruction gap** (a missing "write in first person," a missing language directive, a missing explicit rule — cheap, deterministic to fix, no new ongoing cost) — fix the prompt at its source AND build the detector in the *same* session. Don't wait for a second occurrence (ADR-0103 Addendum 45 is the precedent: found via one package, generalized and fixed immediately, which then surfaced 10 more pre-existing affected characters across 5 more packages that would otherwise have shipped broken indefinitely). Reserve the "wait for 2+ occurrences before building a detector" bar (Addendum 31) for genuine semantic-contradiction defects (secret inversion, wrong evidence ownership, etc.) that a cheap SQL regex can't reliably catch. **A paid LLM-judge detector was explicitly considered and declined for this class (Addendum 56, 2026-09-26)** — the real gap turned out to be sampled vs. full-cast manual coverage (see step 6), which the widened full-cast read now closes at no new ongoing cost. Don't re-propose an LLM-judge tool for this bug class without new evidence that full-cast manual reading itself is insufficient.
  - Full checklist detail and rationale: `docs/adr/0103-new-purchase-coherence-sweep-ritual.md`.

  **"New 'Remove a Character' Purchase" (has a Batch ID field)** → Adaptation Batch Completion Sweep. Batch ID is the only field actually needed. No automated alert exists for this path (ADR-0088 deliberately deferred a cron here — paid packages, needs explicit sign-off before automating), so this manual sweep is currently the only thing that catches a partial batch failure.
  1. Query `mystery_adaptations` for every row with this `batch_id`, ordered by `batch_sequence`. Every row should be `status = 'verified'`. Any `'rolled_back'` or `'failed'` row is a real problem — the batch's own chain-dispatch guarantees it won't get stuck, but "didn't crash" isn't the same as "customer got what they paid for."
  2. For any non-`'verified'` row, read `error_message` and root-cause it before just retrying blindly — a rollback can be a false positive in the verify logic (like the 2026-08-28 sibling-batch-exclusion gap, ADR-0088 addendum) or a genuine unscrubbed content leak; only the former is safe to retry as-is.
  3. Cross-check current package state against what the customer actually paid for: character count in `mystery_characters` + `conversations.player_count` should both reflect every requested removal/reassignment actually landing, not just what the batch's own rows claim.
  4. If a row is stuck non-terminal, root cause fixed, and safe to retry: complete it directly — a new `$0`, pre-`'paid'` single-row `mystery_adaptations` batch + a direct call to `adapt-mystery-apply`, no second charge (the customer already paid for this as part of the original batch). Confirm zero verify issues on the retry.
  5. Found something → fix it, re-verify, CHANGELOG entry + an addendum to **ADR-0088** (the ADR that owns this feature's batching/verify design). Clean → report in chat only, no permanent document for a routine "nothing found."

## Changelog

After every meaningful code change, update `CHANGELOG.md` with a dated entry.

- Match the existing format: date headers (`## YYYY-MM-DD`), category prefixes (`### Fix:`, `### Feature:`, `### Improvement:`, `### UX:`, `### UI:`)
- Each entry: bold category prefix in the header, then bullet points explaining what changed and why
- If today's section doesn't exist yet, create it at the top (below the header)
- Don't duplicate entries — check if the change is already logged
- **Vault sync:** after updating `CHANGELOG.md`, append the same new entry to `/Users/jonathanmiller/Obsidian Vault/01_Projects/Mystery-Maker/changelog.md`

## Architecture Decision Records

When making a technical decision — new dependency, pattern change, API design, infrastructure choice, or deferring a significant feature — create an ADR in `docs/adr/`.

- Use the next sequential number: check the last file in `docs/adr/` and increment (`0013-`, `0014-`, etc.)
- Format: Title, Status, Date, Context, Decision, Rationale, Alternatives Considered, Consequences, Key files
- Include a **Discussion** section capturing key trade-offs debated and how the final decision was reached
- Use `docs/adr/0001-record-architecture-decisions.md` as a formatting reference
- **Vault sync:** after creating the ADR in `docs/adr/`, also write a copy to `/Users/jonathanmiller/Obsidian Vault/01_Projects/Mystery-Maker/decisions/adr-NNNN-slug.md` with this frontmatter prepended:
  ```
  ---
  date: YYYY-MM-DD
  project: mystery-maker
  area: n/a
  type: adr
  tags: [adr, mystery-maker]
  status: open
  ---
  ```
  Status mapping: Accepted → `resolved`, Proposed/Deferred → `open`, Superseded → `superseded`. Add a `## Links` section at the bottom pointing to `[[01_Projects/Mystery-Maker]]`.

## Decision Tracking — Nothing Falls Through the Cracks

Every decision made during work — not just architectural ones — needs a durable home so we can reconstruct the trail. If you're making a call and can't say where it'll be findable in three months, write it down before continuing.

The routing:
- **Code change shipping behaviour** → `CHANGELOG.md` entry (see Changelog section above)
- **Architectural / pattern / dependency / API decision** → ADR in `docs/adr/` (see ADR section above)
- **Deferred work, known-but-unresolved issues, signals worth tracking** (e.g. "Pinterest pipeline broke around date X, 21 slugs need backfill") → vault note in `/Users/jonathanmiller/Obsidian Vault/00_INBOX/<topic>-YYYY-MM-DD-mystery-maker.md` with `status: open` frontmatter
- **Scope decisions during a task** ("we'll fix X but defer Y because Z") → captured in the same ADR/CHANGELOG entry that ships the X-fix. Don't let the "why we didn't do Y" reasoning live only in chat history
- **Operational follow-ups blocked on a date or external signal** → `/schedule` or a vault note with the date

If a decision doesn't fit any of these, default to a vault note in `00_INBOX/` with `status: open`. Better an over-captured note that gets pruned later than a decision that exists only in conversation context.

When closing a task, scan the conversation for decisions made and confirm each one landed in one of the above. If something didn't, capture it before moving on.

## Vault Integration

Obsidian vault for this project: `/Users/jonathanmiller/Obsidian Vault/01_Projects/Mystery-Maker/`

- ADRs and changelog entries are synced to vault per the rules above (automatic, part of the ADR/changelog workflow)
- Session-closing notes go to `00_INBOX/` as `session-YYYY-MM-DD-mystery-maker.md`
- Claude Code conversation history is auto-extracted nightly to `00_INBOX/` via `~/scripts/claude-extract-sync.sh`
  — run "process inbox" in Claude to create summaries and file them

## Model Upgrades — Check for Stale Hardcoded Models

Whenever a Claude model upgrade decision is made (e.g. the ADR-0074 blanket Sonnet 5 upgrade), it's easy to update the primary generation pipeline (Make.com blueprints) and miss standalone edge functions that hand-implement their own Anthropic call with their own hardcoded model string — they have no automated sync with the blueprints they mirror. ADR-0098 Addenda 7/8 found two of these (`regenerate-child-content`, `regenerate-parent-content`) still on Haiku weeks after the blanket upgrade, each also missing the `temperature`/`thinking`/`max_tokens` adjustments Sonnet 5 requires.

Before/after any model upgrade decision, run:
```
grep -rn "claude-haiku\|claude-sonnet\|claude-opus" supabase/functions/*/index.ts
```
Check every hit against the decision just made — deliberately-different models (e.g. a cheaper model for a narrow deterministic extraction task) are fine; anything that's just been forgotten isn't. This is a manual checklist, not automated tooling — deliberately kept that lightweight per the ADR-0098 discussion (the actual risk is bounded, doesn't warrant a shared-config refactor or a standing detector).

## Database Migrations — `supabase migration list` / `db push` Is Not Reliable Here

`supabase migration list` will show most or all of the local `supabase/migrations/*.sql` history as unapplied against remote (empty `remote` column), even when the actual schema/function/data changes are live. Confirmed 2026-09-23 (ADR-0103 Addendum 54 investigation): checked 15 local-only-looking migration names by verifying the actual live object (function body via `pg_get_functiondef`, column via `information_schema.columns`, cron job body, row existence) rather than trusting the migration-log bookkeeping — all 15 were genuinely live. Root cause: `supabase_migrations.schema_migrations` records each migration under the timestamp it was actually *applied* at, not the timestamp in the local filename — and this project's migrations have long been applied via the Supabase Studio SQL editor and/or the Supabase MCP tool's `apply_migration` (not `supabase db push` from the committed file), so the recorded version almost never matches the local filename prefix even when the content is identical. Remote also carries ~570 migrations local has no file for at all (mostly one-off blog-content inserts/translations — expected, not schema drift).

**Practical effect:** don't trust `supabase migration list`'s drift reading, and don't run `supabase db push` to "catch up" — it would try to re-apply already-live changes under new versions, which is harmless for idempotent `CREATE OR REPLACE FUNCTION`/`... IF NOT EXISTS` DDL but can throw or double-apply on anything that isn't (plain `CREATE TABLE`, `ALTER TABLE ADD COLUMN` without the guard, `INSERT` without `ON CONFLICT`).

**To ship a new migration:** apply it directly via the Supabase MCP's `apply_migration` (project id `mhfikaomkmqcndqfohbp`), same as any other project change — but diff the live object first (`pg_get_functiondef(...)` for a function, `information_schema.columns` for a column, etc.) against what you expect pre-change, so you know your `CREATE OR REPLACE`/`ALTER` is additive and not accidentally reverting some other change that landed outside the local migration history. Keep committing the `.sql` file to `supabase/migrations/` regardless — it's still the readable paper trail and diff surface, even though the CLI's own apply/tracking machinery isn't the deploy path here.

## Git Workflow

- **Commit (and push) after every meaningful change, without waiting to be asked first.** This project-level rule overrides the global "commit and push only when I ask" default from `~/.claude/CLAUDE.md`.
  *(why: Jonathan's call, 2026-08-31 — "I can't think of a time where I didn't want to commit a change that I made." Scoped to this project only; the global default still applies elsewhere, including Sync/Pulse's stricter one-trunk-plus-PR workflow where auto-committing to `main` would be wrong.)*
  - "Meaningful change" = the same bar as the Changelog rule above: a real code/config/doc change worth its own CHANGELOG entry, not every intermediate edit mid-task. Commit once the change is complete and verified (type-checked/tested/deployed as applicable), not line-by-line.
  - Still applies: stage only the files for the change actually made (never a blanket `git add -A`), never force-push, never skip hooks, never touch destructive git ops without asking — this rule is about not waiting for permission to commit, not a license for less careful git hygiene.
  - Still commit as a separate, focused commit per logical change (not one giant end-of-session commit) — matches this project's existing pattern of one commit per fix/ADR-addendum.
- Write concise commit messages that explain the "why" not the "what"
