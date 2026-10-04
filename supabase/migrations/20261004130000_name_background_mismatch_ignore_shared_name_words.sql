-- ADR-0139 (health-check false positive, GitHub issue #3, 2026-10-04): name_background_mismatch flagged a customer who renamed
-- "Counselor Willow Byrd" to "Camp Counselor Willow" (Edit Mystery renames character_name but leaves the background's **Name:** line).
-- The two names share two words but neither contains the other, so the substring test and the surname test both fired.
-- A real mismatch (the generator wrote a different character into the background) shares at most a surname, so a pair that shares
-- two or more name words of 3+ letters is treated as the same person under a rename. Everything else in the function is unchanged.

create or replace function public.list_packages_with_structural_defects(_since timestamp with time zone default '2026-04-01 00:00:00+00'::timestamp with time zone)
 returns table(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, defects text[])
 language sql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
  WITH pkg AS (
    SELECT
      mp.id AS package_id,
      mp.conversation_id,
      c.title,
      c.is_paid,
      mp.created_at,
      coalesce(mp.mystery_style, c.mystery_style) AS mystery_style
    FROM mystery_packages mp
    JOIN conversations c ON c.id = mp.conversation_id
    WHERE mp.created_at >= _since
      AND NOT c.is_test
      AND (
        CASE
          WHEN jsonb_typeof(mp.generation_status) = 'object'
            THEN mp.generation_status ->> 'status'
          WHEN jsonb_typeof(mp.generation_status) = 'string'
             AND (mp.generation_status #>> '{}') ~ '^\s*\{'
            THEN ((mp.generation_status #>> '{}')::jsonb) ->> 'status'
          ELSE NULL
        END
      ) IN ('completed', 'complete', 'needs_review')
  ),
  invalid_role AS (
    SELECT p.package_id,
           'invalid_role: ' || array_to_string(
             array_agg(DISTINCT left(regexp_replace(mc.character_role, '\s+', ' ', 'g'), 60)
                       ORDER BY left(regexp_replace(mc.character_role, '\s+', ' ', 'g'), 60)), ', '
           ) AS defect
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id
    WHERE mc.character_role IS NOT NULL
      AND mc.character_role NOT IN ('murderer', 'accomplice', 'suspect', 'redHerring')
    GROUP BY p.package_id
  ),
  multiple_murderers AS (
    SELECT p.package_id,
           'multiple_murderers (' || count(*) || '): ' ||
           array_to_string(array_agg(mc.character_name ORDER BY mc.character_name), ' / ') AS defect
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id AND mc.character_role = 'murderer'
    WHERE p.mystery_style IS DISTINCT FROM 'character'
    GROUP BY p.package_id
    HAVING count(*) > 1
  ),
  named AS (
    SELECT p.package_id, mc.character_name,
           btrim(split_part((regexp_match(coalesce(mc.background, ''), '\*\*Name:\*\*\s*([^\n\r*]+)'))[1], '(', 1)) AS bg_name
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id
  ),
  named_norm AS (
    SELECT package_id, character_name, bg_name,
           lower(regexp_replace(character_name, '[^a-zA-Z]', '', 'g')) AS cn_norm,
           lower(regexp_replace(bg_name, '[^a-zA-Z]', '', 'g')) AS bg_norm,
           lower((regexp_match(character_name, '([A-Za-z]+)[^A-Za-z]*$'))[1]) AS cn_surname,
           lower((regexp_match(bg_name, '([A-Za-z]+)[^A-Za-z]*$'))[1]) AS bg_surname
    FROM named
    WHERE bg_name IS NOT NULL
      AND character_name !~ '/'
      AND bg_name !~ '/'
  ),
  name_background_mismatch AS (
    SELECT a.package_id,
           'name_background_mismatch: ' || array_to_string(
             array_agg(a.character_name || ' -> background says "' || a.bg_name || '"'
                       ORDER BY a.character_name), '; ') AS defect
    FROM named_norm a
    WHERE a.cn_norm <> '' AND a.bg_norm <> '' AND a.cn_norm <> a.bg_norm
      AND position(a.cn_norm IN a.bg_norm) = 0
      AND position(a.bg_norm IN a.cn_norm) = 0
      AND (
        a.cn_surname IS DISTINCT FROM a.bg_surname
        OR EXISTS (
          SELECT 1 FROM named_norm o
          WHERE o.package_id = a.package_id
            AND o.character_name <> a.character_name
            AND o.cn_norm = a.bg_norm
        )
      )
      -- ADR-0139: a rename that keeps two or more name words ("Counselor Willow Byrd" -> "Camp Counselor Willow") is the same person.
      AND (
        SELECT count(*) FROM (
          SELECT w FROM unnest(string_to_array(lower(regexp_replace(a.character_name, '[^a-zA-Z ]', '', 'g')), ' ')) AS w WHERE length(w) >= 3
          INTERSECT
          SELECT w FROM unnest(string_to_array(lower(regexp_replace(a.bg_name, '[^a-zA-Z ]', '', 'g')), ' ')) AS w WHERE length(w) >= 3
        ) shared
      ) < 2
    GROUP BY a.package_id
  ),
  cast_rows AS (
    SELECT p.package_id, mc.character_name,
           lower((regexp_match(mc.character_name, '([A-Za-zÀ-ÿ]+)[^A-Za-zÀ-ÿ]*$'))[1]) AS surname,
           lower(btrim((regexp_match(coalesce(mc.background, ''), '\*\*Role:\*\*\s*([^\n\r]+)'))[1])) AS role_line
    FROM pkg p
    JOIN mystery_characters mc ON mc.package_id = p.package_id
  ),
  dup_groups AS (
    SELECT package_id, surname, role_line,
           array_to_string(array_agg(character_name ORDER BY character_name), ' + ') AS whos
    FROM cast_rows
    WHERE surname IS NOT NULL AND length(surname) >= 3
      AND role_line IS NOT NULL AND length(role_line) > 10
    GROUP BY package_id, surname, role_line
    HAVING count(*) > 1
  ),
  duplicated_cast AS (
    SELECT package_id,
           'duplicated_cast (' || count(*) || ' pair(s)): ' ||
           array_to_string(array_agg(whos ORDER BY whos), '; ') AS defect
    FROM dup_groups
    GROUP BY package_id
  ),
  all_defects AS (
    SELECT * FROM invalid_role
    UNION ALL SELECT * FROM multiple_murderers
    UNION ALL SELECT * FROM name_background_mismatch
    UNION ALL SELECT * FROM duplicated_cast
  )
  SELECT p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at,
         array_agg(d.defect ORDER BY d.defect) AS defects
  FROM pkg p
  JOIN all_defects d ON d.package_id = p.package_id
  GROUP BY p.package_id, p.conversation_id, p.title, p.is_paid, p.created_at
  ORDER BY p.is_paid DESC, p.created_at DESC;
$function$;
