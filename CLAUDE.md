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

## Vault Integration

Obsidian vault for this project: `/Users/jonathanmiller/Obsidian Vault/01_Projects/Mystery-Maker/`

- ADRs and changelog entries are synced to vault per the rules above (automatic, part of the ADR/changelog workflow)
- Session-closing notes go to `00_INBOX/` as `session-YYYY-MM-DD-mystery-maker.md`
- Claude Code conversation history is auto-extracted nightly to `00_INBOX/` via `~/scripts/claude-extract-sync.sh`
  — run "process inbox" in Claude to create summaries and file them

## Git Workflow

- After committing, always push to the remote branch
- Write concise commit messages that explain the "why" not the "what"
