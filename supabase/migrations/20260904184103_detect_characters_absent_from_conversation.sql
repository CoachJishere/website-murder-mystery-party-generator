-- ADR-0118 follow-up: candidate detector for the fabrication failure shape found
-- 2026-09-04 (a character's name/role invented by the generation pipeline instead
-- of coming from the customer's actual conversation). A fabricated character's
-- name typically appears NOWHERE in the source conversation transcript, which is
-- a stronger, more direct signal than content-quality heuristics -- checks whether
-- ANY substantive token of a character's name (split on whitespace, "/", and
-- apostrophes; tokens >= 3 chars to skip trivial/common short words) appears
-- anywhere in the conversation's messages. Under-flags on purpose for generic
-- archetype-labeled characters (e.g. character_name = 'Werewolf', 'Zombie') --
-- those trivially match the theme vocabulary that legitimately appears throughout
-- a monster-themed conversation, so this detector is not useful for catching a
-- wrong ARCHETYPE, only a wholly invented NAME. Swept once against all 81 paid
-- packages with a snapshot as of 2026-09-04: zero flags beyond the already-known
-- Hollingsworth Estate incident (already hand-fixed).

CREATE OR REPLACE FUNCTION public.package_characters_absent_from_conversation(_pkg mystery_packages)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _conversation_text text;
  _missing text[] := '{}';
  _char record;
  _aliases text[];
  _alias text;
  _found boolean;
BEGIN
  SELECT string_agg(coalesce(content, ''), ' ')
  INTO _conversation_text
  FROM messages
  WHERE conversation_id = _pkg.conversation_id;

  IF _conversation_text IS NULL OR length(_conversation_text) = 0 THEN
    RETURN NULL; -- no transcript to check against; don't false-flag on missing data
  END IF;

  FOR _char IN
    SELECT character_name FROM mystery_characters WHERE package_id = _pkg.id
  LOOP
    _aliases := (
      SELECT array_agg(DISTINCT lower(token))
      FROM regexp_split_to_table(_char.character_name, E'[\\s/''’"]+') AS token
      WHERE length(token) >= 3
    );

    IF _aliases IS NULL OR array_length(_aliases, 1) = 0 THEN
      CONTINUE; -- name too short/generic to meaningfully check; skip rather than false-flag
    END IF;

    _found := false;
    FOREACH _alias IN ARRAY _aliases LOOP
      IF _conversation_text ILIKE '%' || _alias || '%' THEN
        _found := true;
        EXIT;
      END IF;
    END LOOP;

    IF NOT _found THEN
      _missing := array_append(_missing, _char.character_name);
    END IF;
  END LOOP;

  IF array_length(_missing, 1) > 0 THEN
    RETURN array_to_string(_missing, ', ');
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_packages_with_characters_absent_from_conversation(
  _since timestamptz DEFAULT '2020-01-01 00:00:00+00'::timestamptz
)
RETURNS TABLE(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamptz, missing_characters text)
LANGUAGE sql
STABLE
AS $$
  SELECT mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at,
         public.package_characters_absent_from_conversation(mp.*)
  FROM mystery_packages mp
  JOIN conversations c ON c.id = mp.conversation_id
  WHERE (mp.generation_status->>'status') IN ('completed', 'needs_review')
    AND mp.created_at >= _since
    AND public.package_characters_absent_from_conversation(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$$;
