# ADR-0158 host-seal checks (read-only, no paid calls)

Re-check the "I'm also playing" switch against REAL paid packages. All outputs go to the OS temp dir (customer text), never into the repo.

- `../seal-corpus.mjs`: how many paid detective packages have a reveal heading vs fail closed, and the name-part hits a sealed host still sees.
  `node --experimental-strip-types scripts/host-seal/seal-corpus.mjs` (add `SNIPS=1` for context; read the snippets, name hits are not all leaks).
- Render check (real `MysteryPackageTabView` and `HostAccess`, chromium over file://, because the sandboxed shell cannot reach localhost):
  1. `node scripts/host-seal/render-check/fetch-fixtures.mjs` (override ids with `FIXTURES='en_detective=<idPrefix>,...'`; `old_detective` must be a package with NO reveal heading)
  2. `node scripts/host-seal/render-check/build.mjs`
  3. `node scripts/host-seal/render-check/drive.mjs`, then look at the screenshots in the temp dir.
- Needs `.env` with `VITE_SUPABASE_URL` and the service-role key (read-only GETs), and the repo's installed `esbuild`, `playwright`, `tailwindcss`.
- Known benign hit: the Portuguese fixture matches the VICTIM's surname (shared with the culprit); the culprit's own names have 0 hits.
