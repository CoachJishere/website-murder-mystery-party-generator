-- Backfill: normalise double-encoded generation_status.
--
-- WHY: 24 mystery_packages rows (18 of them status=completed) stored
-- generation_status as a jsonb STRING containing JSON text, rather than a jsonb
-- object — i.e. `"{\"status\":\"completed\",...}"` instead of
-- `{"status":"completed",...}`. On those rows `generation_status->>'status'`
-- returns NULL, so the `... = 'completed'` filter used by EVERY detector
-- (ADR-0016 missing-images, ADR-0041 identity, ADR-0042 content-quality) and by
-- the health check's stuck/needs_review checks SILENTLY SKIPPED them. Real
-- defects hid there — including "Death At The Velvet Viper", whose post-
-- regeneration verification returned false-clean because the content detectors
-- literally could not see the row. (ADR-0048's structural detector tolerated
-- both encodings; nothing else did.)
--
-- Discovered 2026-08-01 during the ADR-0048 structural-detector work.
--
-- FIX: decode the jsonb string to a proper jsonb object. Lossless — the object
-- holds the identical data. Idempotent: only touches string-typed rows whose
-- decoded text is a JSON object. Applied live 2026-08-01; this file is the
-- durable record and is safe to re-run.
--
-- ⚠️ ROOT CAUSE NOT YET FIXED (separate follow-on): something in the write path
-- (Make.com Supabase module, or an edge function double-JSON.stringify-ing the
-- status) persists generation_status as a string on some runs. Until that is
-- found and fixed, new rows will double-encode again and re-hide from the
-- detectors. This backfill clears the existing 24; it does not prevent recurrence.

UPDATE mystery_packages
SET generation_status = (generation_status #>> '{}')::jsonb
WHERE jsonb_typeof(generation_status) = 'string'
  AND (generation_status #>> '{}') ~ '^\s*\{';
