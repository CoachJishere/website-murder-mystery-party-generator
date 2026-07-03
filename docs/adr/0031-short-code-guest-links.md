# 0031 — Short-code guest links (`/c/<8-char>`) via a resolver alias

**Status:** Accepted
**Date:** 2026-07-03

## Context

ADR-0030 shipped copy-link guest sharing. The copied URL was
`https://www.mysterymaker.party/character/<access_token>` (or the `/c/<token>`
path alias), where `access_token` is a **UUID** — so the link ran ~77 characters,
which looks unwieldy when pasted into WhatsApp/iMessage. The host asked to shorten
it.

The three RPCs that serve the guest page (`get_character_by_token`,
`get_character_details`, `get_packet_metadata_by_token`) all key off the
`access_token` UUID. That UUID is not merely an identifier — it is the **bearer
credential** that unlocks a guest's character sheet, which contains the mystery's
solution and other guests' secrets. So any shortening scheme trades some of the
UUID's 122 bits of unguessability for brevity, and the replacement must stay hard
enough to guess that a stranger can't enumerate their way into another party's
content.

## Decision

Add an **8-character base62 short code** as a lookup alias for the UUID, resolved
at page load — the UUID stays the real credential.

1. **`short_code` column** on `character_assignments`: `text NOT NULL UNIQUE`,
   defaulted by a new `gen_short_code(len int default 8)` Postgres function
   (rejection-sampled `gen_random_bytes` → unbiased base62). All 150 existing rows
   backfilled with unique codes.
2. **Resolver RPC** `get_token_by_short_code(code text) → uuid`, `SECURITY DEFINER`,
   granted to `anon` + `authenticated`. Returns only the UUID (same exposure model
   as the token itself). The three character RPCs are **unchanged**.
3. **Frontend**: `CharacterAccess` inspects the URL param — if it's a UUID it uses
   it directly (email / canonical `/character/<uuid>` links); otherwise it resolves
   the short code to the UUID first, then proceeds identically. `copyShareLink`
   builds `/c/<short_code>` (the row insert returns the code).
4. **Length = 8** (host's call): keyspace 62^8 ≈ 2.2×10^14. At ~10^4 assignments a
   random guess lands ~1 in 2×10^10 — effectively unguessable. URL drops to
   ~30 chars (`mysterymaker.party/c/Xk9f2pQ3`).

## Rationale

- **Resolver alias over re-keying.** Duplicating the three token RPCs to accept a
  short code would triple the surface with no benefit. One tiny resolver + a
  client-side UUID/short-code branch keeps the change minimal and leaves the proven
  token path untouched.
- **UUID stays canonical.** Email links and every existing `/character/<uuid>` (and
  the `/c/<uuid>` links shipped this morning under ADR-0030) keep working because
  the frontend still accepts a UUID param directly. No link breaks.
- **8 chars is the knee of the curve.** 6 chars (57 billion) would also be safe with
  rate-limiting but has a thinner margin; 11 chars buys headroom nobody needs at
  this scale. 8 is unguessable here and still short.
- **Codes are pasted, not typed**, so full base62 (including easily-confused
  `0/O`, `l/1`) is fine — no need to shrink the alphabet for legibility.

## Alternatives Considered

- **External shortener (Bitly, etc.)** — rejected. Sends private guest-content URLs
  to a third party that may log/index them, and adds a runtime dependency.
- **Path/domain trimming only** (`/c/` + apex, ADR-0030) — kept as the fallback, but
  leaves the 36-char UUID in the URL; insufficient on its own.
- **Re-key all three RPCs to short_code** — more surface, no upside over the resolver.
- **Shorter code (6) / longer (11)** — see Rationale; 8 chosen deliberately.
- **Nullable `short_code`** — rejected; `NOT NULL` + default guarantees every row
  (incl. future inserts) is shareable with no app-side generation.

## Discussion

The load-bearing question was security, not plumbing: a short code is a weaker
bearer secret than a UUID, and it guards spoiler content. Framed as a length/​risk
trade-off with concrete guess-odds, the host chose 8 chars — the point where the
URL is dramatically shorter yet enumeration stays infeasible at product scale.

**Collision handling** is left to the `UNIQUE` constraint. At 8 chars the per-insert
collision probability is ~10^-10; the birthday probability across the 150-row
backfill is ~10^-7. Both are negligible, so a colliding insert would surface as a
rare, retryable error rather than justify a generate-and-retry trigger (kept simple
per the "prefer simple over clever" rule). If assignment volume ever grows by
orders of magnitude, revisit with a retry trigger or a longer code.

**Rate-limiting** on the resolver was considered and deferred — the keyspace already
makes brute-forcing impractical, and Supabase has no drop-in per-IP RPC throttle.
Recorded as future hardening if abuse ever appears.

## Consequences

- Copied links drop from ~77 to ~30 chars. Email keeps the canonical UUID URL.
- One new public attack surface (`get_token_by_short_code`), mitigated by the 8-char
  keyspace; it leaks nothing the token URL didn't already.
- Every `character_assignments` row now carries a `short_code`; verified backfill
  (150/150 unique, all `^[0-9A-Za-z]{8}$`). Confirmed the resolver works from the
  **anon** role end-to-end (valid → UUID, bogus → null).
- `CharacterAccess` now does one extra round-trip for short-code links (none for
  UUID links).

## Key files

- [supabase/migrations/20260703_character_assignment_short_codes.sql](../../supabase/migrations/20260703_character_assignment_short_codes.sql) — function, column, backfill, resolver RPC
- [src/pages/CharacterAccess.tsx](../../src/pages/CharacterAccess.tsx) — UUID-vs-short-code resolution
- [src/components/MysteryGuestManager.tsx](../../src/components/MysteryGuestManager.tsx) — `copyShareLink` builds `/c/<short_code>`
- [src/integrations/supabase/types.ts](../../src/integrations/supabase/types.ts) — `short_code` on `character_assignments`
- Related: [0030-copy-link-guest-sharing.md](0030-copy-link-guest-sharing.md)
