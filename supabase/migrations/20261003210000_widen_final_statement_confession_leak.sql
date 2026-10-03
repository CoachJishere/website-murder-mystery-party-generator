-- ADR-0103 Addendum 81 (2026-10-03): list_packages_with_final_statement_confession_leak
-- had two blind spots, both found on "Hedberg Hollow".
--   1. Missed a final_accomplice that confesses: the accomplice regex only matched
--      "I helped (him|her|them)", so "I helped put something out of sight" and
--      "I chose them over the truth" slipped through (a paid heal regenerated exactly
--      that text into the Final Statement, which is read BEFORE the reveal).
--   2. Flagged a denial as a confession: the negation list lacked neither/nor/never,
--      so "neither one of them means I killed him" was reported as a leak.
-- Only the two regexes change. Corpus check before applying: zero new hits since
-- 2026-08-06 (no new false positives), the single old hit was the "neither" false positive.
-- Still a list function only (not wired into package_completion_blocking_defects).
CREATE OR REPLACE FUNCTION public.list_packages_with_final_statement_confession_leak(_since timestamp with time zone DEFAULT '2026-08-06 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, characters text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH leaked AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at, mc.character_name
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id
    WHERE (mp.generation_status->>'status') IN ('completed', 'needs_review') AND mp.created_at >= _since
      AND NOT c.is_test
      AND mp.mystery_style = 'character'
      AND (
        (
          mc.reveal_confession_guilty IS NOT NULL
          AND mc.final_guilty ~* '\mI (did it|killed|poisoned|stabbed|shot|struck)\M'
          AND mc.final_guilty !~* '\m(does.?n.?t|does not|did.?n.?t|did not|is.?n.?t|is not|was.?n.?t|was not|won.?t|will not|wouldn.?t|would not|neither|nor|never|none( of (it|that|this))?|nothing)\M(\s+\S+){0,5}?\s+\mI (did it|killed|poisoned|stabbed|shot|struck)\M'
        )
        OR
        (
          mc.reveal_confession_accomplice IS NOT NULL
          AND mc.final_accomplice ~* '\mI (helped (him|her|them|hide|bury|cover|put|move|get rid)|stood watch|hid |chose (him|her|them) over|covered for)'
          AND mc.final_accomplice !~* '\m(does.?n.?t|does not|did.?n.?t|did not|is.?n.?t|is not|was.?n.?t|was not|won.?t|will not|wouldn.?t|would not|neither|nor|never|none( of (it|that|this))?|nothing)\M(\s+\S+){0,5}?\s+\mI (helped (him|her|them|hide|bury|cover|put|move|get rid)|stood watch|hid |chose (him|her|them) over|covered for)'
        )
      )
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS characters
  FROM leaked
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$function$;
