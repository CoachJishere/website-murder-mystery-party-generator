-- ADR-0103 Addendum 87 Update 4: list_packages_with_meta_text_leak() still timed out intermittently after Update 3
-- (08:00 and 08:13 UTC on 2026-10-07; 3.9 to 6.5 s against the 8 s PostgREST limit, depending on load).
--
-- The remaining cost is the word-loop pattern in package_meta_text_leak(), run on every character of every package
-- under 7 days old: `\m(\w{2,})\M(\s+\1\M){4,}` (about 1.5 s over the last 7 days of character text). Rewriting the
-- repeat as a non-capturing group with an exact count, `(?:\s+\1\M){4}`, takes 0.3 to 0.4 s on the same text. The
-- pattern is only ever used as a boolean `~*` test, and "at least 4 repeats" matches exactly the texts that
-- "4 repeats" matches (the extra repeats are just more of the same match), so results are identical. Checked on live
-- data before applying: package_meta_text_leak() output compared for all 259 packages, 0 differing (9 hits).
--
-- Patched by exact-text replacement on the live definition (asserting exactly one occurrence) so nothing else in the
-- function can drift, same approach as 20261004140000_meta_text_leak_closing_label.sql.
DO $$
DECLARE
  d text := pg_get_functiondef('public.package_meta_text_leak(mystery_packages)'::regprocedure);
  old_rx text := '(\s+\1\M){4,}';
  new_rx text := '(?:\s+\1\M){4}';
  cnt int;
BEGIN
  cnt := (length(d) - length(replace(d, old_rx, ''))) / length(old_rx);
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'expected exactly 1 loop_rx occurrence in package_meta_text_leak, found %', cnt;
  END IF;
  EXECUTE replace(d, old_rx, new_rx);
END $$;
