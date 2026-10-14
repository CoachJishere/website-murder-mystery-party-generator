-- ADR-0161: package-level scaffolding (evidence card headings, the Significance label, the Game Overview heading) is localized in non-English
-- packages. Three detectors keyed on the English words; they now accept the localized forms too. English packages behave exactly as before.

-- 1. Evidence images: a card is a heading (h2, or h3 in older packages) naming round 2, 3 or 4 in any round word of the scaffold table.
CREATE OR REPLACE FUNCTION public.list_packages_missing_evidence_images(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, cards_in_text integer, images_present integer, missing_rounds text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pkg AS (
    SELECT
      mp.id,
      mp.conversation_id,
      c.title,
      c.is_paid,
      mp.created_at,
      coalesce(
        CASE WHEN jsonb_typeof(mp.evidence_cards) = 'string'
             THEN mp.evidence_cards #>> '{}'
             ELSE mp.evidence_cards::text END,
        ''
      ) AS ec_text,
      coalesce(mp.evidence_card_images, '{}'::jsonb) AS imgs
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE (mp.generation_status->>'status') = 'completed'
      AND mp.created_at >= _since
      AND NOT c.is_test
      AND (mp.generation_completed_at IS NULL
           OR mp.generation_completed_at < now() - interval '45 minutes')
  ),
  scored AS (
    SELECT
      p.id,
      p.conversation_id,
      p.title,
      p.is_paid,
      p.created_at,
      (SELECT count(*) FROM regexp_matches(p.ec_text,
         '(^|\n)#{2,3}[ \t][^\n]*(round|ronda|manche|runde|turno|rodada|ronde|runda|kierros|라운드|ラウンド)[ \t]*[2-4]([^0-9]|$)', 'gi'))::integer
        + (SELECT count(*) FROM regexp_matches(p.ec_text, '(^|\n)##[ \t][^\n]*第[ \t]*[2-4][ \t]*轮', 'g'))::integer AS cards_in_text,
      (SELECT count(*) FROM jsonb_object_keys(p.imgs))::integer AS images_present,
      ARRAY(
        SELECT 'round' || n
        FROM (VALUES (2), (3), (4)) AS rounds(n)
        WHERE (p.ec_text ILIKE '%EVIDENCE: ROUND ' || n || '%'
               OR p.ec_text ~* ('(^|\n)#{2,3}[ \t][^\n]*(round|ronda|manche|runde|turno|rodada|ronde|runda|kierros|라운드|ラウンド)[ \t]*' || n || '([^0-9]|$)')
               OR p.ec_text ~ ('(^|\n)##[ \t][^\n]*第[ \t]*' || n || '[ \t]*轮'))
          AND coalesce(p.imgs ->> ('round' || n), '') = ''
      ) AS missing_rounds
    FROM pkg p
  )
  SELECT
    s.id,
    s.conversation_id,
    s.title,
    s.is_paid,
    s.created_at,
    s.cards_in_text,
    s.images_present,
    s.missing_rounds
  FROM scored s
  WHERE array_length(s.missing_rounds, 1) > 0
  ORDER BY s.is_paid DESC, s.created_at DESC;
$function$;

-- 2. Evidence spoiler: the host-only Significance section is removed before the murderer's surname is searched for, in any language.
CREATE OR REPLACE FUNCTION public.list_packages_with_evidence_culprit_spoiler(_since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, murderer text, surname text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH murderer AS (
    SELECT mp.id AS package_id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
           mc.character_name,
           (regexp_match(mc.character_name, '([A-Za-z]+)[^A-Za-z]*$'))[1] AS surname,
           regexp_replace(coalesce(mp.evidence_cards #>> '{}',''),
             '#### (SIGNIFICANCE|SIGNIFICADO|SIGNIFICATION|BEDEUTUNG|SIGNIFICATO|BETEKENIS|BETYDNING|BETYDELSE|MERKITYS|의미|意味|意义)[^#]*', '', 'gi') AS player_evidence
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    JOIN mystery_characters mc ON mc.package_id = mp.id AND mc.character_role = 'murderer'
    WHERE (mp.generation_status->>'status') IN ('completed', 'needs_review') AND mp.created_at >= _since
      AND NOT c.is_test
  )
  SELECT package_id, conversation_id, title, is_paid, created_at,
         character_name AS murderer, surname
  FROM murderer
  WHERE surname IS NOT NULL AND length(surname) >= 4
    AND player_evidence ~* ('\m' || surname || '\M')
  ORDER BY is_paid DESC, created_at DESC;
$function$;

-- 3. Victim mismatch: the first alternative looked for the English "Game Overview" heading; it now takes the first heading, whatever it says.
CREATE OR REPLACE FUNCTION public.package_victim_mismatch_candidate(_pkg mystery_packages)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH ov AS (
    SELECT coalesce(
      (regexp_match(coalesce(_pkg.game_overview,''),
         '^\s*#+[^\n]*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)'))[1],
      (regexp_match(coalesce(_pkg.game_overview,''),
         'Dr\.\s+([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)'))[1],
      (regexp_match(coalesce(_pkg.game_overview,''),
         '([A-Z][a-zA-Z''-]+\s+[A-Z][a-zA-Z''-]+)\s+(?:was\s+found|had\s+been|is\s+dead|was\s+killed|was\s+murdered|was\s+poisoned)'))[1]
    ) AS overview_name
  ),
  named AS (
    SELECT overview_name, (regexp_match(overview_name, '([A-Za-z]+)$'))[1] AS surname
    FROM ov WHERE overview_name IS NOT NULL
  )
  SELECT n.overview_name
  FROM named n
  WHERE length(n.surname) >= 4
    AND coalesce(_pkg.master_context,'') !~* ('\m' || n.surname || '\M')
    AND NOT EXISTS (
      SELECT 1 FROM mystery_characters mc
      WHERE mc.package_id = _pkg.id
        AND (coalesce(mc.background,'') || ' ' || coalesce(mc.relationships::text,'')) ~* ('\m' || n.surname || '\M')
    );
$function$;
