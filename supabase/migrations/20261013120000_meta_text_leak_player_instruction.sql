-- ADR-0103 Addendum 93 (Dead Man's Saddle): a character sheet whose narrative field hands a decision back to the player
-- ("Choose for yourself what this secret is, in keeping with your character...") is a defect the gate could not see.
-- Adds an `instruction_rx` marker and an `instruction_txt` (secret + background + relationships + description) to the
-- character half of package_meta_text_leak(). Spoken fields are deliberately excluded (see
-- supabase/functions/auto-remediate-packages/player-instruction.ts, which mirrors this and must be kept in sync by hand).
--
-- Applied as a guarded in-place edit of the LIVE function body so nothing else in it can drift (the earlier migrations
-- for this function were applied under different timestamps, see CLAUDE.md "Database Migrations"). Idempotent: a second
-- run is a no-op. Each anchor must occur exactly once or the whole migration aborts.
DO $mig$
DECLARE
  d text := pg_get_functiondef('public.package_meta_text_leak(mystery_packages)'::regprocedure);
  a1 text := $a$'\muntil\M'::text AS until_rx,$a$;
  b1 text := $b$'\muntil\M'::text AS until_rx,
      '(choose for yourself|decide for yourself|in keeping with your character|up to you to (decide|choose))'::text AS instruction_rx,$b$;
  a2 text := $a$) AS narrow_txt$a$;
  b2 text := $b$) AS narrow_txt,
        (
          coalesce(mc.secret,'') || ' ' || coalesce(mc.background,'') || ' ' ||
          coalesce(mc.relationships::text,'') || ' ' || coalesce(mc.description::text,'')
        ) AS instruction_txt$b$;
  a3 text := $a$OR t.narrow_txt ~* m.narrative_only_rx)$a$;
  b3 text := $b$OR t.narrow_txt ~* m.narrative_only_rx
           OR t.instruction_txt ~* m.instruction_rx)$b$;
BEGIN
  IF d LIKE '%instruction_rx%' THEN
    RAISE NOTICE 'package_meta_text_leak already has instruction_rx; nothing to do';
    RETURN;
  END IF;
  IF (length(d) - length(replace(d, a1, ''))) <> length(a1)
     OR (length(d) - length(replace(d, a2, ''))) <> length(a2)
     OR (length(d) - length(replace(d, a3, ''))) <> length(a3) THEN
    RAISE EXCEPTION 'package_meta_text_leak anchors not found exactly once; live body differs from what this migration expects';
  END IF;
  d := replace(replace(replace(d, a1, b1), a2, b2), a3, b3);
  EXECUTE d;
END
$mig$;
