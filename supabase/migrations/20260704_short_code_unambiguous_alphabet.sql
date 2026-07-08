-- ADR-0031 follow-up: drop visually-confusable characters from short codes.
-- A real incident (2026-07-04) had a guest's code `fWpeLIQl` (capital I + lowercase l)
-- mis-read as `fWpeLlQl` — the two are near-identical in most fonts, so the guest's
-- link 404'd. Remove {0 O 1 I l} from the alphabet so new codes can't contain a
-- confusable pair. Existing codes are left untouched (links already distributed).
-- 57-char alphabet: 57^8 ≈ 1.1e14, still unguessable at product scale.
create or replace function public.gen_short_code(len int default 8)
returns text
language plpgsql
volatile
as $$
declare
  -- base62 minus 0 O 1 I l (the classic confusables)
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  n constant int := length(alphabet); -- 57
  result text := '';
  i int;
  rnd int;
begin
  for i in 1..len loop
    loop
      rnd := get_byte(gen_random_bytes(1), 0);
      exit when rnd < 228; -- 228 = 57*4, keeps the mapping uniform
    end loop;
    result := result || substr(alphabet, (rnd % n) + 1, 1);
  end loop;
  return result;
end;
$$;
