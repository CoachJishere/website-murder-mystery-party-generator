# Murder Mystery Party Generator — Claude Code Instructions

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

## Git Workflow

- After committing, always push to the remote branch
- Write concise commit messages that explain the "why" not the "what"
