# ADR-0103: New-Purchase Coherence Sweep — a standing practice, not a one-off audit

- **Status:** Accepted
- **Date:** 2026-08-22
- **Related:** ADR-0098 Addenda 4-8 (the audit this ritual is distilled from), ADR-0074 (blanket Sonnet 5 upgrade), ADR-0042 (the original content-quality detectors this ritual leans on and works around)

## Context

A single hands-on audit of one customer's package (Lyn DiFranco, ADR-0098 Addendum 4) turned up real, customer-facing coherence bugs — a victim-name mismatch, a self-contradicting secret, dangling references to removed characters, a garbled sentence, a leaked prompt placeholder — none of which the existing automated content-quality detectors (ADR-0042) caught. Widening the sweep found the same defect family in 14 more packages across a year of history (Addenda 5-6), and confirmed the detectors themselves had real bugs of their own (a `\b`-vs-`\M` regex mistake that silently disabled a whole marker family, and a false positive on a legitimate template token) — bugs only found by re-verifying results by hand rather than trusting a clean detector run at face value.

Jonathan now gets a paid purchase roughly every day or few days and wants to spot-check each one for coherence, the way today's audit did, without either (a) re-deriving the whole methodology from a blank prompt each time, or (b) the checklist quietly drifting/forgetting steps between sessions. He asked, in effect, for the same kind of low-friction ritual this project already has for session-closing and inbox-processing — paste a purchase notification into a fresh tab, say one word, get the same thorough check every time.

## Decision

Adopt **"sweep"** as a project shorthand command (documented in `CLAUDE.md`, which every fresh session auto-loads — no separate memory/pre-prompt setup needed). Invoking it with a pasted purchase notification (conversation ID is the only required field) runs the following checklist:

1. **Resolve the package.** From `conversation_id`: `package_id`, `created_at`, `mystery_style`, `player_count`, `has_accomplice`, `is_paid`, `purchase_date`, and the conversation's language/theme.
2. **Note the model era.** Pre- or post- 2026-08-11 (ADR-0074's blanket Sonnet 5 upgrade). Pre-upgrade packages get extra scrutiny — that's where every defect found so far has clustered — but post-upgrade is not skipped; the one post-upgrade package checked so far needed a full manual read anyway because it was non-English (see step 6).
3. **Run the two patched detectors** scoped to this package (`list_packages_with_meta_text_leak`, `list_packages_with_victim_mismatch`). Treat a clean result as a data point, not proof — both have documented blind spots (ADR-0098 Addendum 6): `victim_mismatch`'s core check still cannot catch a victim surname that's wrong but legitimately belongs to a different, living character in the same package, which was Lyn's actual bug.
4. **Manual victim-name consistency check.** Extract the victim's name from `game_overview` and `detective_script`; cross-check against what 3-4 characters' own background/relationships sections call the victim. Any mismatch is high-severity by default — this is the exact shape of the worst bug found to date.
5. **Read the full detective_script** (or a large sample) end to end for leaked brackets/placeholders, garbled sentences (another character's name inserted mid-sentence), and — if `mystery_style = 'character'` (slip-style) — confirm any `[MURDERER NAME]`-style bracket is the *legitimate* host-fill-in convention (paired with an explicit stage direction telling the host to write in the name), not an accidental leak. Bracket patterns are not inherently bugs; context decides.
6. **Spot-check 2-3 characters' full content** (relationships, secrets, round scripts, accusations) for leaked authoring notes, self-directed questions, dangling references to removed characters (relevant only if this package went through Remove-a-Character), and broken/garbled sentences. **If the package is non-English, do this check in that language** — the automated detectors are English-pattern regexes and will not catch an equivalent leak in Spanish, French, etc. (confirmed clean on the one non-English package checked so far, but only because it was checked by hand, not because the detectors would have caught a problem).
7. **Run `package_completion_blocking_defects()`** to catch genuinely missing content — a different defect class (empty fields) from the leaked/garbled-text family everything else above targets.
8. **If something is found:** fix directly (targeted SQL edits, matching the patterns already established), re-verify with the same checks, and log a CHANGELOG entry plus an addendum to *this* ADR (not ADR-0098 — that ADR's own topic is a specific stuck-invocation incident already carrying 8 addenda on an adjacent-but-distinct investigation; this one is the dedicated home for the sweep ritual and its findings going forward).
9. **If the package is clean:** report back in chat only. No CHANGELOG entry, no ADR addendum — a "nothing found" result for a routine, expected-to-usually-be-clean check doesn't need a permanent artifact, and logging every clean sweep would bloat the trail past the point of being useful. (This is a deliberate exception to the project's general "every decision needs a durable home" rule — a sweep finding nothing isn't a decision, it's the ritual working as intended.)

## Rationale

- **CLAUDE.md over a memory-system entry**, because this is a *procedure* (repeatable steps triggered by a keyword), and the project already has this exact pattern for session-closing and inbox-processing — both live in CLAUDE.md, not in the auto-memory system, which is reserved for facts/preferences/context rather than playbooks. A fresh session auto-loads CLAUDE.md with zero setup from Jonathan; the auto-memory system is for the assistant's own accumulated understanding, not a stand-in for a checklist a human should be able to read and audit too.
- **A dedicated new ADR over folding into ADR-0098**, because ADR-0098 is already a specific incident report (a stuck batch invocation) that grew 8 addenda through an adjacent but genuinely different investigation (content-quality, not invocation reliability). A ritual that will recur every few days for the indefinite future deserves its own numbered home rather than continuing to stretch an ADR whose title no longer describes most of its content.
- **Clean sweeps get no permanent document**, a deliberate carve-out from this project's usual "capture every decision" rule — logging "checked, found nothing" every few days would make the CHANGELOG/ADR trail worse at its actual job (surfacing real decisions and defects) by drowning them in routine confirmations. The chat transcript itself is the record for a clean result; only findings get written down.
- **Detector results are a data point, not a verdict**, because this session directly proved that "the detector says zero hits" and "the package is actually clean" are different claims — twice (the `\b` bug, and the same-package-swap blind spot that's still unfixed by design). The checklist's manual steps (4, 5, 6) exist specifically to catch what the automated layer is known not to.

## Alternatives Considered

- **A slash command / skill.** Would work, but this project doesn't currently have custom skills wired up, and a CLAUDE.md section achieves the same "say one word, get the full checklist" outcome with zero additional tooling to build or maintain — consistent with this session's broader conclusion (in the model-staleness discussion) that the actual risk here doesn't warrant new infrastructure.
- **Fully automating the sweep** (a cron job that runs it on every new purchase). Rejected for now: steps 4-6 are judgment calls a human-in-the-loop read still does better than a regex, per the exact detector-blind-spot findings above. Revisit if/once the model-era risk concentration (almost everything found so far is pre-2026-08-11) is confirmed to have fully resolved and the checklist can safely shrink to steps 3+7 alone.

## Consequences

**Positive:**
- Jonathan can open a fresh tab, paste a purchase notification, say "sweep," and get the exact same thorough check every time — no re-explaining the methodology, no risk of a step being forgotten because a session started cold.
- The checklist is itself durable and auditable (this file), not locked inside one conversation's memory.

**Negative:**
- Still requires a human judgment pass (steps 4-6) — not a zero-effort automated gate. Acceptable given the "Alternatives Considered" reasoning above.
- Clean-sweep results aren't logged anywhere permanent, so there's no running count of "how many packages have been checked" without reconstructing it from chat history. Acceptable trade against not bloating the CHANGELOG/ADR trail.

## Key files

- `CLAUDE.md` — the `sweep` shorthand command definition
- This ADR — the checklist itself, and the home for future addenda when a sweep finds and fixes something
