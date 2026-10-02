-- ADR-0103 Addendum 78: package_dangling_quote_mark() (Addendum 55) also catches a stray trailing DOUBLE quote.
-- Trigger: "El Ultimo Brindis De Laia" (2026-10-02) ended Edu's accomplice confession with a stray curly closing quote (.”),
-- which the single-quote-only check missed. Corpus check: 6 delivered packages across 2025-07..2026-09 carry the same shape
-- with a straight or curly double quote (Windsor Christmas Masquerade, Costa Del Karaoke, Coral Cove, The Final Cut,
-- Multiverse Gala, Champagne & Crocodile Tears) - the same Make.com stray-quote bug, other quote glyph.
-- Strictly additive: the original single-quote test is kept verbatim as one branch; the double-quote branch has its own
-- "no opening quote anywhere in the text" guard, so a confession wrapped in a real pair of quotes is never flagged.
CREATE OR REPLACE FUNCTION public.package_dangling_quote_mark(_pkg mystery_packages)
 RETURNS text[]
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH fields AS (
    SELECT character_name, 'introduction' AS field, introduction AS val
      FROM mystery_characters WHERE package_id = _pkg.id AND introduction IS NOT NULL
    UNION ALL
    SELECT character_name, 'final_statement', final_statement
      FROM mystery_characters WHERE package_id = _pkg.id AND final_statement IS NOT NULL
    UNION ALL
    SELECT character_name, 'reveal_confession_guilty', reveal_confession_guilty
      FROM mystery_characters WHERE package_id = _pkg.id AND reveal_confession_guilty IS NOT NULL
    UNION ALL
    SELECT character_name, 'reveal_confession_accomplice', reveal_confession_accomplice
      FROM mystery_characters WHERE package_id = _pkg.id AND reveal_confession_accomplice IS NOT NULL
    UNION ALL
    SELECT character_name, 'final_innocent', final_innocent
      FROM mystery_characters WHERE package_id = _pkg.id AND final_innocent IS NOT NULL
  ),
  hits AS (
    SELECT DISTINCT (field || ':' || character_name) AS source
    FROM fields
    WHERE (trim(val) ~ '[.!?][''’]$'
           AND val !~ '(^|[\s(:])[''’]\S')
       OR (trim(val) ~ '[.!?]["”]$'
           AND val !~ '(^|[\s(:])["“]\S')
  )
  SELECT array_agg(source ORDER BY source) FROM hits;
$function$;
