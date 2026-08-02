-- ADR-0060: catch an overview that kills off a PLAYABLE character.
--
-- The existing victim_mismatch check asks "is the overview's victim ABSENT from
-- master_context and every character background?" That cannot catch the inverse and
-- more damaging shape: the overview names a LIVING SUSPECT as the victim. The name is
-- present (as a suspect), so the absence test passes and the package ships.
--
-- Found 2026-08-02 on "The Cognitive Dissonance Incident" (paid): the overview opens
-- "Dr. Morgan Cho ... was found dead", but the real victim is Dr. Morgan Hartwell and
-- Morgan/Merritt Cho is a playable suspect. A host reading the overview would brief
-- their guests on the wrong dead person while one of them holds that character's script.
--
-- This check needs no victim extraction at all -- it asks the question directly: does the
-- overview describe any playable character as dead? Character names are expanded through
-- the "A/B Last" gender-variant convention first ("Morgan/Merritt Cho" -> "Morgan Cho",
-- "Merritt Cho") because that is the form the overview prose actually uses.
--
-- Validated against all 101 packages with an overview: exactly ONE hit, the known case.
-- Zero false positives, which is the ADR-0053 bar for gating rather than merely alerting.
--
-- NOTE on why extraction was abandoned: the incumbent victim_mismatch extractor
-- (`Game Overview\s*\n+\s*([A-Z][a-z]+\s+[A-Z][a-z]+)`) returns NULL on 79 of 101
-- packages (78%) -- any title ("Dr.") or preamble ("On the morning of October 14th,")
-- defeats it, so that detector is inert on most of the corpus. A looser extractor was
-- attempted and rejected: it returned garbage (" But", " When", "Game Overview\n\nMaster")
-- because a wide gap lets it grab any capitalised word near a death phrase. Fixing the
-- extractor is tracked separately; this check deliberately sidesteps it.

CREATE OR REPLACE FUNCTION public.package_victim_is_playable_character(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH variants AS (
    SELECT mc.character_name, btrim(v) AS variant
    FROM mystery_characters mc,
    LATERAL (SELECT unnest(ARRAY[
        mc.character_name,
        regexp_replace(mc.character_name, '^(.*?)/[^ ]+( .*)$', '\1\2'),
        regexp_replace(mc.character_name, '^([^/]*?)([A-Za-z''`-]+)/([^ ]+)( .*)$', '\1\3\4')
    ]) AS v) t
    WHERE mc.package_id = _pkg.id
      AND btrim(v) <> ''
      AND length(btrim(v)) >= 6          -- too-short names collide with common words
  )
  SELECT CASE WHEN count(*) = 0 THEN NULL
              ELSE array_agg(DISTINCT 'victim_is_playable_character.' || character_name)
         END
  FROM variants
  WHERE coalesce(_pkg.game_overview,'') ~* (
      regexp_replace(variant, '([\[\](){}.*+?^$\\|])', '\\\1', 'g')
      || '[^.!?]{0,80}(was found dead|found dead|was murdered|was killed|was poisoned'
      || '|was stabbed|was strangled|lies dead|had been murdered|had been killed)'
  );
$function$;

-- Read-only detector for the 6-hourly health check and the ADR-0047 worker.
-- Status filter includes needs_review per ADR-0055.
CREATE OR REPLACE FUNCTION public.list_packages_with_victim_as_character(
  _since timestamp with time zone DEFAULT '2026-04-01 00:00:00+00'::timestamp with time zone)
 RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean,
               created_at timestamp with time zone, offenders text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_victim_is_playable_character(mp.*)
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (mp.generation_status->>'status') IN ('completed', 'needs_review')
    AND mp.created_at >= _since
    AND public.package_victim_is_playable_character(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$function$;

-- Wire into the single shared gate predicate, spliced programmatically so the existing
-- ~150 lines of validated checks (ADR-0049/0052/0053) are preserved byte-for-byte.
DO $migration$
DECLARE
  _def text; _new text;
  _anchor text := '  IF array_length(_defects, 1) IS NULL THEN';
  _block text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO _def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'package_completion_blocking_defects';

  IF _def IS NULL THEN RAISE EXCEPTION 'package_completion_blocking_defects() not found'; END IF;
  IF position('victim_is_playable_character' in _def) > 0 THEN RAISE NOTICE 'already wired'; RETURN; END IF;
  IF position(_anchor in _def) = 0 THEN RAISE EXCEPTION 'anchor not found; refusing to splice blindly'; END IF;

  _block :=
    '  -- ADR-0060: overview kills off a playable character (inverse of victim_mismatch,' || E'\n' ||
    '  -- which only catches a victim ABSENT from the cast). Zero false positives across' || E'\n' ||
    '  -- all 101 historical packages with an overview.' || E'\n' ||
    '  _defects := _defects || coalesce(public.package_victim_is_playable_character(_pkg), ARRAY[]::text[]);' || E'\n' || E'\n';

  _new := replace(_def, _anchor, _block || _anchor);
  EXECUTE _new;

  SELECT pg_get_functiondef(p.oid) INTO _def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'package_completion_blocking_defects';
  IF position('victim_is_playable_character' in _def) = 0 THEN RAISE EXCEPTION 'splice did not take'; END IF;
END
$migration$;
