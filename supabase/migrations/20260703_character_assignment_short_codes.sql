-- Short-code URLs for guest character links (ADR-0031)
--
-- Adds an 8-char base62 short_code to character_assignments so hosts can share
-- a compact link (mysterymaker.party/c/<code>) instead of the ~77-char UUID URL.
-- The UUID access_token remains the real bearer credential; short_code is a
-- lookup alias that resolves to it via get_token_by_short_code(). The email flow
-- keeps using /character/<uuid>.

-- Unbiased 8-char base62 generator (rejection-samples bytes to avoid modulo bias).
create or replace function public.gen_short_code(len int default 8)
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result text := '';
  i int;
  rnd int;
begin
  for i in 1..len loop
    loop
      rnd := get_byte(gen_random_bytes(1), 0);
      exit when rnd < 248; -- 248 = 62*4, keeps the mapping uniform
    end loop;
    result := result || substr(alphabet, (rnd % 62) + 1, 1);
  end loop;
  return result;
end;
$$;

-- Add the column (nullable first so we can backfill existing rows).
alter table public.character_assignments
  add column if not exists short_code text;

-- Backfill existing rows with unique codes.
update public.character_assignments
  set short_code = public.gen_short_code(8)
  where short_code is null;

-- Lock it down: default for future inserts + NOT NULL + uniqueness.
alter table public.character_assignments
  alter column short_code set default public.gen_short_code(8),
  alter column short_code set not null;

create unique index if not exists character_assignments_short_code_key
  on public.character_assignments (short_code);

-- Public resolver: map a short_code to its access_token UUID.
-- SECURITY DEFINER so anon can resolve the alias without broad table access;
-- returns only the UUID (itself the bearer token — same exposure as before).
create or replace function public.get_token_by_short_code(code text)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select access_token
  from public.character_assignments
  where short_code = code
  limit 1;
$$;

grant execute on function public.get_token_by_short_code(text) to anon, authenticated;
