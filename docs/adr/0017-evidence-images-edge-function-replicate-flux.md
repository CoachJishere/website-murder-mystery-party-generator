# ADR-0017: Generate Evidence-Card Images in a Supabase Edge Function via Replicate Flux 1.1 Pro

- **Status:** Accepted
- **Date:** 2026-06-11

## Context

Evidence-card forensic images (`mystery_packages.evidence_card_images`, jsonb `{round2, round3, round4}`) are currently generated **inside the Make.com parent scenario**. Parent40 (the live blueprint, "ImagenTimeout120") contains **12 Imagen HTTP modules** — 4 routes × 3 rounds — each calling `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict`, plus **4 `store-evidence-images` calls** (one per route) that batch-upsert the base64 results after all three rounds of a route complete.

Two independent problems converged on this flow:

1. **Quality.** Imagen 4 output skews CGI/illustration-looking despite photorealism cues in the prompt. This was already confirmed and fixed for the Pinterest pipeline — commit `b7004e4` (2026-06-11) swapped Imagen 4 → Replicate Flux 1.1 Pro (`black-forest-labs/flux-1.1-pro`, same ~$0.04/image), which is meaningfully more photographic. The user then tested Flux vs Imagen for the **evidence cards** and reached the same conclusion: Imagen underperforms Flux at the same price.

2. **Fragility.** The 12-module flow is the root cause behind the evidence-image recovery saga (ADR-0016): a single Imagen call exceeding its timeout aborts the route before the batch upsert runs, leaving `evidence_card_images = NULL` while `generation_status = completed`. The Apr 2026 `[builtin:Resume]` error handlers stop one failure from cascading — but they do so by **silently skipping** the failed image, which is precisely what made those gaps invisible. The handlers make the scenario *survive* failure, not *avoid* it, and they do nothing to reduce 12-module maintenance.

ADR-0016 **explicitly deferred** the durable fix to "a separate Make image scenario redesign" (vault note `00_INBOX/make-image-scenario-redesign-2026-06-08-mystery-maker.md`), naming the load-bearing changes as: save each image as it completes, error-tolerant modules, raised timeout — and the real prize as an **independent retry hook the monitoring sweep can fire to auto-recover images**. This ADR realizes that deferred work, and goes one step further than 0016 imagined: rather than keep generation in Make with a better-structured scenario, it moves generation **out of Make entirely** into versioned edge-function code, which simultaneously enables the Flux switch.

## Decision

Add a new Supabase edge function **`generate-evidence-images`** that owns the full image step:

- **Input** (POST): `{ package_id, prompts: { round2, round3, round4 } }`.
- For each round with a non-empty prompt, call Replicate **Flux 1.1 Pro** (`black-forest-labs/flux-1.1-pro/predictions`, `aspect_ratio: "16:9"` to match the evidence-card format, `output_format: "png"`, `Prefer: wait=60` for synchronous completion), fetch the output URL → bytes, upload to the `evidence-images/<package_id>/roundN.png` bucket, and collect the public URL. The three rounds run **in parallel**, each in its own `try/catch`, so one round's failure cannot lose the others.
- Merge successful URLs into `mystery_packages.evidence_card_images` using the same partial-tolerant merge as `store-evidence-images`.
- **Returns** `{ success, evidence_card_images, generated, failed }` — a real, inspectable result instead of a silent skip.

The Make.com parent scenario is restructured so that, **per route**, the 3 Imagen modules + the 1 `store-evidence-images` call are replaced by a **single** call to `generate-evidence-images`. `REPLICATE_API_TOKEN` is added to Supabase edge-function secrets (confirmed by the user; mirrors the GitHub Actions secret the Pinterest pipeline already uses).

`store-evidence-images` is **kept unchanged** for manual recovery and backward compatibility. Rollout is staged: the contract is validated first via a small **test blueprint** (`MM Test - Evidence Images v8 (Flux)`) before **Parent41** is cut from Parent40. Parent40 is preserved untouched so revert = re-import the old blueprint.

## Rationale

- **Fixes both problems at once.** One change retires the brittle 12-module/silent-skip flow *and* upgrades photorealism to the model already proven in the Pinterest pipeline.
- **Eliminates the data-loss root cause.** Per-round independent upload + partial merge means a single round's failure no longer aborts the others — the exact failure mode ADR-0016 catalogued.
- **Real errors, not silent skips.** The function returns which rounds failed; the caller (and logs) can see it. Replaces the "looks complete, has no images" trap.
- **Realizes the deferred auto-recovery hook.** The monitoring sweep / `list_packages_missing_evidence_images()` backlog (ADR-0016) can now call `generate-evidence-images` directly with just the missing rounds — the same self-healing pattern already used for empty characters. This was named as the prize in 0016's Discussion.
- **Shrinks the Make attack surface.** One HTTP call per route instead of four collapses the raw-body JSON-escaping surface (see `feedback: makecom raw body escaping`) and **removes the hardcoded Gemini API key** that currently sits in the (git-tracked) blueprints.
- **Versioned and maintainable.** Image logic moves from the Make UI (un-versioned, hand-edited) into code under review.

## Alternatives Considered

1. **Swap the 12 Imagen modules to Replicate in-place (Make UI).** Rejected: still 12 hand-edited modules + 12 re-applied Resume handlers + raw-body escaping per module, and it *keeps* the silent-skip behaviour. The Resume handlers were raised as already mitigating fragility — but they survive failure rather than prevent it, so they argue *for* consolidation, not against it.
2. **Separate Make image scenario with incremental save (ADR-0016's original deferred plan), keeping Imagen.** This fixes fragility but not quality, and leaves image generation in un-versioned Make modules. Moving to an edge function fixes fragility *and* unlocks the model swap in versioned code for marginal extra effort.
3. **Flux Kontext Pro** (the model the user named). Rejected for this use case: Kontext is built for image *editing* (optional `input_image`); evidence cards are pure text-to-image with no source image. Flux **1.1 Pro** is the dedicated text-to-image model, already proven in our Pinterest pipeline at the same price. User confirmed 1.1 Pro.
4. **Extend `store-evidence-images` to also generate** (accept prompts and call Replicate itself). Rejected: overloads a function whose single responsibility is storage/merge, and complicates the manual-recovery path that deliberately accepts pre-made bytes/URLs. A separate generator keeps responsibilities clean.
5. **Share one Replicate helper across Pinterest and the edge function.** Not practical: `scripts/pinterest/lib/compose.mjs` is Node (`process.env`, `Buffer`) and the edge function is Deno (`Deno.env`). The Replicate call is deliberately mirrored (~30 lines) with a pointer comment rather than abstracted across runtimes — duplication is the simpler choice here.

## Consequences

- **New runtime dependency in an edge function:** `generate-evidence-images` requires `REPLICATE_API_TOKEN` in Supabase secrets. If unset, the function returns a clear error rather than failing silently.
- **Two model code-paths to keep in step:** Pinterest (Node) and evidence cards (Deno) both call Flux 1.1 Pro via mirrored code. A future model bump touches both; the pointer comment flags this.
- **Make still escapes prompts into a JSON body**, but now for one call per route instead of four. The same escaping discipline applies; the surface is smaller.
- **Generation latency** moves into a single synchronous edge-function call (~15s for 3 parallel rounds). The Make HTTP module timeout must be set generously (≥120s) to cover Replicate cold starts.
- **Reversible:** Parent40 is preserved; revert = re-import it. `store-evidence-images` is untouched. The new function is additive — nothing calls it until Make is rewired.
- **Pre-existing secret exposure surfaced:** the Gemini key hardcoded in the tracked `MM Test - Evidence Images v*` / parent blueprints (e.g. v7 line 58) predates this work and remains in git history. The new flow stops propagating it, but rotating that key is a separate cleanup (vault note).

## Discussion

**On the Resume-handler question (raised by the user):** "didn't we add handlers that fix this?" Yes — the Apr 2026 `[builtin:Resume]` handlers were real and stopped cascading aborts. But they resolve a *different* problem than consolidation: they let a failed image be skipped silently and the scenario continue. That silent skip is exactly the mechanism behind the ADR-0016 gaps (`NULL` images, `status = completed`, surfaced only by a single easy-to-miss email that `heal` then buried). So the handlers were worth having, yet they neither reduce the 12-module maintenance load nor change the "looks complete, isn't" failure mode — both of which the edge function does fix.

**Why an edge function rather than 0016's "separate Make scenario":** 0016 correctly identified that the load-bearing fix is per-image save + tolerance + timeout, not scenario isolation per se. An edge function achieves all three natively (per-round try/catch + partial merge + a single generous timeout) *and* moves the logic into versioned code *and* makes the Flux swap a code change rather than 12 UI edits. The auto-recovery retry hook 0016 wanted becomes a direct function call.

**Sequencing / revert safety (user requirement):** validate via `MM Test - Evidence Images v8 (Flux)` before touching the live parent; cut **Parent41** as a new file so Parent40 stays as the revert point; in the Make UI, clone the live scenario before importing Parent41.

## Key Files

- `supabase/functions/generate-evidence-images/index.ts` — new generator (Replicate Flux 1.1 Pro → upload → merge)
- `supabase/functions/store-evidence-images/index.ts` — unchanged; manual-recovery + partial-merge reference whose upload/merge logic this mirrors
- `scripts/pinterest/lib/compose.mjs` — `callFlux11Pro` (Node), the proven Replicate call this Deno version mirrors
- `temp-files/MM Test - Evidence Images v8 (Flux).blueprint.json` — test scenario validating the contract
- `temp-files/MM Live - Parent40 (ImagenTimeout120).blueprint.json` — preserved revert point; Parent41 is cut from it
- [docs/adr/0016-detect-missing-evidence-images-decoupled-from-needs-review.md](0016-detect-missing-evidence-images-decoupled-from-needs-review.md) — deferred this redesign; defines the auto-recovery hook this enables
