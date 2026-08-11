-- Fix false positives in list_packages_with_final_statement_confession_leak
-- (ADR-0067 follow-up detector, shipped 2026-08-09/2026-08-10).
--
-- Found live 2026-08-11: both packages the health-check flagged ("The Host
-- Herself" / Cameron-Camille Voss, "Murder At Camp Pine Shadow" / Pixie Lens)
-- are false positives. The confession keyword regex has no negation guard, so
-- it matches denial sentences that happen to contain the confession phrase
-- right after a negation: "...doesn't mean I poisoned anyone" and "None of
-- that means I did it." Both final_guilty fields are genuine denials, exactly
-- as ADR-0067 intends; the actual confession is correctly isolated in
-- reveal_confession_guilty.
--
-- Same failure class already documented for the sibling detective-style
-- detector in ADR-0070 ("I didn't kill O'Malley for pleasure" tripping a
-- confession match) and already guarded against in this same migration file's
-- murderer_flags/accomplice_flags CTEs (positive-match AND NOT negative-match
-- pattern). This applies the equivalent guard here: exclude a confession-verb
-- match if a negation word appears within 5 words before it.
CREATE OR REPLACE FUNCTION public.list_packages_with_final_statement_confession_leak(
  _since timestamp with time zone DEFAULT '2026-08-06 00:00:00+00'::timestamp with time zone
)
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
          AND mc.final_guilty !~* '\m(does.?n.?t|does not|did.?n.?t|did not|is.?n.?t|is not|was.?n.?t|was not|won.?t|will not|wouldn.?t|would not|none( of (it|that|this))?|nothing)\M(\s+\S+){0,5}?\s+\mI (did it|killed|poisoned|stabbed|shot|struck)\M'
        )
        OR
        (
          mc.reveal_confession_accomplice IS NOT NULL
          AND mc.final_accomplice ~* '\mI (helped (him|her|them)|stood watch)\M'
          AND mc.final_accomplice !~* '\m(does.?n.?t|does not|did.?n.?t|did not|is.?n.?t|is not|was.?n.?t|was not|won.?t|will not|wouldn.?t|would not|none( of (it|that|this))?|nothing)\M(\s+\S+){0,5}?\s+\mI (helped (him|her|them)|stood watch)\M'
        )
      )
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT character_name ORDER BY character_name) AS characters
  FROM leaked
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$function$;
