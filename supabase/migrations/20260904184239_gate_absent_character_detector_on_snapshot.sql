-- Refinement found immediately on first real sweep run: without gating on
-- approved_concept_message_id, this detector false-positives heavily on
-- theme-only briefs (customer never proposed specific names at all, e.g. "Luxury
-- train ride in the Swiss Alps, 12 players, no accomplice" -- 4 messages total,
-- no roster ever discussed) where the AI inventing every character name is
-- CORRECT, expected behavior, not the ADR-0118 defect. The defect only makes
-- sense when the customer actually proposed and approved a specific roster that
-- then got ignored/displaced -- so only check packages whose conversation has a
-- captured snapshot at all.
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
    AND c.approved_concept_message_id IS NOT NULL
    AND public.package_characters_absent_from_conversation(mp.*) IS NOT NULL
  ORDER BY c.is_paid DESC, mp.created_at DESC;
$$;
