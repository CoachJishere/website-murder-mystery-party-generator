# 0030 — Copy-link guest sharing (optional email) + short `/c/:token` alias

**Status:** Accepted
**Date:** 2026-07-03

## Context

Hosts share each guest their personalised character materials through the
**Share Characters with Guests** dialog ([MysteryGuestManager.tsx](../../src/components/MysteryGuestManager.tsx)).
Today the only delivery channel is email: the host must type a guest **name and a
valid email**, then click **Send**, which inserts a `character_assignments` row
(minting a unique `access_token`), marks it `is_sent = true`, and invokes the
`send-character-email` Edge Function. That email is the only place the guest's
access URL (`/character/:token`) is ever surfaced.

Two frictions:

1. **No way to share the link yourself.** Many hosts want to paste the link into a
   WhatsApp/Signal/iMessage thread rather than have us email it. There was no
   "copy link" affordance anywhere — the URL only lived inside the outbound email.
2. **Email was mandatory to create a row.** Because `access_token` is only minted
   when a row is inserted, and the insert required a valid email, there was no way
   to obtain a link without also committing to the email channel.

The host also values the current behaviour as a **ledger**: entering a guest name
and seeing a green "Sent" check lets them look back later and see who received
which character. That value comes from `guest_name` + `is_sent`/`sent_at`, and is
independent of *how* the link travelled.

The `access_token` is a UUID (36 chars), so the full URL
(`https://www.mysterymaker.party/character/<uuid>`) is ~77 characters.

## Decision

1. **Add a per-guest "Copy link" action** alongside the existing "Send" (email)
   button. Copying:
   - ensures a `character_assignments` row exists (inserting if needed, which mints
     the `access_token`),
   - writes the guest URL to the clipboard,
   - marks the row `is_sent = true` / stamps `sent_at` — i.e. **copying counts as
     sending** for ledger purposes (see Discussion), locking the name in exactly as
     the email path does.
   - Works on already-sent rows too, so a host can re-grab a link after the fact.

2. **Make email optional.** `guest_name` remains required (it is the ledger key);
   the email field is now optional. The email column is only needed for the
   email-send path. Because `character_assignments.guest_email` is `NOT NULL`, the
   copy-link path inserts an empty string `''` rather than null.

3. **Add a short route alias `/c/:token`** in [App.tsx](../../src/App.tsx) that
   renders the same `CharacterAccess` page as `/character/:token`. Copied links use
   `/c/`, trimming the path from `/character/` to `/c/`. The token is unchanged, so
   no new lookup/RPC is involved. `/character/:token` stays as the canonical URL the
   email uses, so no existing links break.

4. **Defer true short codes.** Genuinely short links
   (e.g. `mysterymaker.party/c/Xk9f2p`) would require a separate short-code column,
   a public lookup RPC, its own route, and a security review of that RPC. That is a
   subsystem, not a one-liner, and is explicitly out of scope here. Recorded as a
   possible follow-up.

## Rationale

- The link already exists and the guest route already works token-only (no login);
  copy-link is almost entirely a UI surface over infrastructure that is already in
  production. Low risk, high utility.
- Keeping `guest_name` required preserves the ledger the host relies on, so the new
  channel costs nothing in traceability.
- Reusing the existing `access_token` + `CharacterAccess` page for `/c/:token` means
  the "shortening" ships with zero data-model or security change.

## Alternatives Considered

- **A mode toggle ("email mode" vs "link mode").** Rejected — it frames email and
  link as mutually exclusive and forces the host to choose up front, when in fact
  both are just delivery channels over the same row. Two action buttons per row is
  simpler and lets the host mix channels per guest.
- **A distinct "Copied" state separate from "Sent."** Rejected as extra UI state for
  little gain; from the host's point of view copying *is* sending, and collapsing
  them keeps the ledger honest with no schema change.
- **Full short-code system now.** Deferred (see Decision 4) — disproportionate to
  the ask, which was "shorten if easy, totally optional."
- **Nullable `guest_email`.** Rejected — avoids a migration; inserting `''` is
  sufficient and keeps the column contract intact.

## Discussion

The core tension the host raised was: *"I like that it locks in names so I can see
who I sent to, but I mostly want to copy a link and send it via WhatsApp."* The
resolution is that name-locking and delivery channel are orthogonal — the ledger is
`guest_name` + `is_sent`, not the email itself. So we can add the link channel
without weakening traceability, which is why this is **not** a toggle: a toggle
would have coupled the two again.

On whether copy-link should mark the row "Sent": yes. The alternative (a separate
"link copied, not sent" state) would leave the ledger ambiguous — the host copied a
link and handed it over, which is functionally "sent." Marking it sent locks the
name (the behaviour the host explicitly likes) and reuses the existing Edit → unlock
path if they need to change it.

Clipboard write happens after an `await` on the row insert, which Safari can block
outside a direct user gesture. Mitigation: the copy helper falls back to surfacing
the URL in a toast for manual copy if `navigator.clipboard.writeText` throws.

## Consequences

- Hosts can share via any channel; the app is no longer the sole sender.
- Rows can now exist with an empty `guest_email` (copy-link-only guests). Any code
  assuming `guest_email` is always populated should treat it as possibly-empty. The
  14-day guest-feedback email keys off `guest_email`, so link-only guests simply
  won't receive it — acceptable.
- A second public URL shape (`/c/:token`) now resolves to character content. It is
  the same token and same RLS/RPC path as `/character/:token`, so no new exposure.
- "Send All" remains email-only (it can't drive the clipboard); copy-link is
  inherently one guest at a time.

## Key files

- [src/components/MysteryGuestManager.tsx](../../src/components/MysteryGuestManager.tsx) — copy-link action, optional email, shared persist helper
- [src/App.tsx](../../src/App.tsx) — `/c/:token` alias route
- [src/pages/CharacterAccess.tsx](../../src/pages/CharacterAccess.tsx) — unchanged; serves both routes
- [src/i18n/locales/en.json](../../src/i18n/locales/en.json) — new button/toast strings
