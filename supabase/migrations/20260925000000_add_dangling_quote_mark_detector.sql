-- ADR-0103 Addendum 55: new detector for a recurring generation artifact — an
-- unmatched, dangling closing quote mark at the very end of the LAST field
-- emitted in a Make.com child-scenario JSON generation call (introduction,
-- final_statement, reveal_confession_guilty, reveal_confession_accomplice,
-- final_innocent). Found via manual sweep on "The Gala Of Daggers"
-- (2026-09-25), then confirmed corpus-wide: 51 live rows across ~30 already-
-- delivered packages, all corrected via direct UPDATE the same session.
--
-- Heuristic: field ends in terminal punctuation immediately followed by a
-- single quote, with no legitimate opening quote (this corpus's own
-- quoting convention — a quote preceded by start-of-string, whitespace,
-- '(' or ':') found anywhere earlier in the field. This narrowly targets
-- the dangling-quote artifact without false-positiving on this corpus's
-- extensive legitimate use of single-quoted dialogue lines (rumors,
-- suggested deflection lines, etc.), which always have a matching opener.

CREATE OR REPLACE FUNCTION public.list_packages_with_dangling_quote_mark(_since timestamptz DEFAULT '2026-04-01 00:00:00+00'::timestamptz)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamptz, sources text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH fields AS (
    SELECT mc.package_id, mc.character_name, 'introduction' AS field, mc.introduction AS val FROM mystery_characters mc WHERE mc.introduction IS NOT NULL
    UNION ALL SELECT mc.package_id, mc.character_name, 'final_statement', mc.final_statement FROM mystery_characters mc WHERE mc.final_statement IS NOT NULL
    UNION ALL SELECT mc.package_id, mc.character_name, 'reveal_confession_guilty', mc.reveal_confession_guilty FROM mystery_characters mc WHERE mc.reveal_confession_guilty IS NOT NULL
    UNION ALL SELECT mc.package_id, mc.character_name, 'reveal_confession_accomplice', mc.reveal_confession_accomplice FROM mystery_characters mc WHERE mc.reveal_confession_accomplice IS NOT NULL
    UNION ALL SELECT mc.package_id, mc.character_name, 'final_innocent', mc.final_innocent FROM mystery_characters mc WHERE mc.final_innocent IS NOT NULL
  ),
  hits AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           (f.field || ':' || f.character_name) AS source
    FROM fields f
    JOIN mystery_packages mp ON mp.id = f.package_id
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (
        (mp.generation_status->>'status' = 'completed'
         AND (mp.generation_completed_at IS NULL OR mp.generation_completed_at < now() - interval '45 minutes'))
        OR mp.generation_status->>'status' = 'needs_review'
      )
      AND mp.created_at >= _since
      AND trim(f.val) ~ '[.!?][''’]$'
      AND f.val !~ '(^|[\s(:])[''’]\S'
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         array_agg(DISTINCT source ORDER BY source) AS sources
  FROM hits
  GROUP BY package_id, conversation_id, title, is_paid, created_at
  ORDER BY is_paid DESC, created_at DESC;
$function$;
