-- ADR-0103 Addendum 102 (2026-10-14): two false-positive shapes in
-- list_packages_with_final_statement_confession_leak, found on the health-check
-- issue #5 comment (Dead Man's Saddle / Dr. Adeline Marsh, Murder At Montero
-- Manor / Madame Celeste Devereaux). Both final statements were denials.
--   1. final_guilty "I could have left that tox screen in a drawer ... and I did
--      not. ... I did it because he deserved better": "I did it" is about speaking
--      up. Now ignored when "I did not" precedes "I did it because/for/so" within
--      250 characters (the regex repetition cap is 255). A bare "I did it" and
--      "I did it because she threatened me" still flag.
--   2. final_accomplice "I hid none of it": the negation sits AFTER the verb, which
--      the existing before-the-verb negation list cannot see. "hid " now needs a
--      lookahead that rules out none/nothing/no/nobody.
-- Only the two positive regexes change. Corpus check before applying (every
-- slip-style character since 2026-08-06): only the two known false positives flip
-- to clean, no other row changes. Positive controls still flag. Still a list
-- function only (not part of package_completion_blocking_defects).
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
          AND mc.final_guilty !~* '\mI did not\M[^\n]{0,250}\mI did it\M(\s+(because|for|so)\M)'
        )
        OR
        (
          mc.reveal_confession_accomplice IS NOT NULL
          AND mc.final_accomplice ~* '\mI (helped (him|her|them|hide|bury|cover|put|move|get rid)|stood watch|hid (?!(none|nothing|no|nobody)\M)|chose (him|her|them) over|covered for)'
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
