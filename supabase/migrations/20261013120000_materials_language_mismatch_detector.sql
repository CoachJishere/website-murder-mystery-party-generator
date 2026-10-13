-- ADR-0103 Addendum 91 (2026-10-13): the Themed Materials Make modules intermittently wrote the props list in Spanish on English packages
-- (5 of 7 English packages from 2026-10-09). Detector: stopword-ratio language of `materials` versus `game_overview`, same word lists and
-- thresholds as supabase/functions/_shared/languageDetect.ts (best >= 0.05 of words and >= 2x the runner-up). `materials` is short (about
-- 60 to 100 words), so the minimum is 25 words instead of 40. Returns NULL when the languages agree or either is unclear.
create or replace function public.detect_text_language(_t text, _min_words int default 40)
returns text language sql immutable set search_path to 'public','pg_temp' as $$
  with w as (select coalesce(array_length(regexp_split_to_array(btrim(coalesce(_t,'')), '\s+'), 1), 0) n),
  pats(lang, pat) as (values
    ('en', '\y(the|and|you|your|was|that|with|for|have|this|but|not|are|from|they|what|his|her)\y'),
    ('es', '\y(el|los|las|pero|más|está|también|cuando|donde|sobre|entre|muy|sin|porque|había|fue|soy|eres|nada|todo|todos|este|ese|esa|usted|ustedes|nuestro|nuestra|hay|ser|con)\y'),
    ('fr', '\y(est|dans|vous|nous|avec|mais|pas|une|qui|sur|cette|être|très|aussi|je|suis|elle|ils|sont|pour|comme|tout)\y'),
    ('de', '\y(und|nicht|ich|ist|mit|eine|aber|auch|noch|wir|euch|für|das|der|die|ein|dem|den|sich|war|hat)\y'),
    ('it', '\y(che|non|sono|per|una|della|nel|questo|anche|più|molto|ho|hai|gli|del|nella|essere|ma|come|era)\y'),
    ('pt', '\y(não|uma|você|para|mas|com|está|foi|são|mais|muito|também|ele|dos|nos|meu|minha|isso|era)\y'),
    ('nl', '\y(het|een|niet|van|zijn|maar|ook|nog|jullie|dat|voor|wij|naar|met|ik|heb|dit|was|geen)\y'),
    ('da', '\y(og|ikke|jeg|af|hvad|noget|nogen|også|være|havde|kunne|hun|hende|vores|deres|meget|selv|der)\y'),
    ('sv', '\y(och|inte|jag|av|vad|något|någon|också|vara|hade|kunde|hon|henne|vår|våra|mycket|själv|där)\y')),
  scored as (select lang, (select count(*) from regexp_matches(_t, pat, 'gi'))::numeric / nullif((select n from w), 0) r from pats),
  ranked as (select lang, r, row_number() over (order by r desc) rk from scored)
  select case when (select n from w) < _min_words then null
              when (select r from ranked where rk = 1) < 0.05 or (select r from ranked where rk = 1) < 2 * (select r from ranked where rk = 2) then null
              else (select lang from ranked where rk = 1) end;
$$;

-- Per-language stopword ratio of a text (wider lists than detect_text_language: short prop lists are full of "de", "la", "un").
create or replace function public.text_language_scores(_t text)
returns table(lang text, r numeric) language sql immutable set search_path to 'public','pg_temp' as $$
  with w as (select greatest(coalesce(array_length(regexp_split_to_array(btrim(coalesce(_t,'')), '\s+'), 1), 0),1) n),
  pats(lang, pat) as (values
    ('en', '\y(the|and|you|your|was|that|with|for|have|this|but|not|are|from|they|what|his|her|to|of|in|on|or)\y'),
    ('es', '\y(el|los|las|pero|más|está|también|cuando|donde|sobre|entre|muy|sin|porque|había|fue|soy|eres|nada|todo|todos|este|ese|esa|usted|ustedes|nuestro|nuestra|hay|ser|con|de|para|un|una|del|en|y|la)\y'),
    ('fr', '\y(est|dans|vous|nous|avec|mais|pas|une|qui|sur|cette|être|très|aussi|je|suis|elle|ils|sont|pour|comme|tout|de|des|les|le|la|du|et|un)\y'),
    ('de', '\y(und|nicht|ich|ist|mit|eine|aber|auch|noch|wir|euch|für|das|der|die|ein|dem|den|sich|war|hat|zu|im|auf)\y'),
    ('it', '\y(che|non|sono|per|una|della|nel|questo|anche|più|molto|ho|hai|gli|del|nella|essere|ma|come|era|di|il|la|le|con|un|in|e)\y'),
    ('pt', '\y(não|uma|você|para|mas|com|está|foi|são|mais|muito|também|ele|dos|nos|meu|minha|isso|era|de|do|da|os|as|um|em|e)\y'),
    ('nl', '\y(het|een|niet|van|zijn|maar|ook|nog|jullie|dat|voor|wij|naar|met|ik|heb|dit|was|geen|de|en|op|te)\y'),
    ('da', '\y(og|ikke|jeg|af|hvad|noget|nogen|også|være|havde|kunne|hun|hende|vores|deres|meget|selv|der|en|et|til|med|på|som)\y'),
    ('sv', '\y(och|inte|jag|av|vad|något|någon|också|vara|hade|kunde|hon|henne|vår|våra|mycket|själv|där|en|ett|till|med|på|som)\y'))
  select lang, (select count(*) from regexp_matches(_t, pat, 'gi'))::numeric / (select n from w) from pats;
$$;

-- Language of the game_overview (clear, 40+ words) against the stopword scores of the materials list: flagged when another language scores
-- at least 0.08 and at least twice the overview's own language. Validated 2026-10-13: the Spanish Silver Nightingale list scores es 0.37 against en 0.00;
-- over every package since 2026-01-01 it flags 2 (a TEST package and a July Portuguese package with an English list, both real).
create or replace function public.package_materials_language_mismatch(_pkg mystery_packages)
returns text language sql stable set search_path to 'public','pg_temp' as $$
  with o as (select public.detect_text_language(_pkg.game_overview, 40) lang),
  s as (select lang, r from public.text_language_scores(_pkg.materials)),
  own as (select coalesce((select r from s where lang = (select lang from o)), 0) r),
  oth as (select lang, r from s where lang <> (select lang from o) order by r desc limit 1)
  select case when (select lang from o) is null or coalesce(array_length(regexp_split_to_array(btrim(coalesce(_pkg.materials,'')), '\s+'), 1), 0) < 25 then null
              when (select r from oth) >= 0.08 and (select r from oth) >= 2 * (select r from own) then 'materials=' || (select lang from oth) || ' overview=' || (select lang from o)
              else null end;
$$;

create or replace function public.list_packages_with_materials_language_mismatch(_since timestamp with time zone default '2026-04-01 00:00:00+00')
returns table(package_id uuid, conversation_id uuid, title text, is_paid boolean, created_at timestamp with time zone, mismatch text)
language sql stable security definer set search_path to 'public','pg_temp' as $$
  select mp.id, mp.conversation_id, c.title, c.is_paid, mp.created_at, public.package_materials_language_mismatch(mp)
  from mystery_packages mp join conversations c on c.id = mp.conversation_id
  where (mp.generation_status->>'status' in ('completed','needs_review'))
    and mp.created_at >= _since
    and public.package_materials_language_mismatch(mp) is not null
  order by c.is_paid desc, mp.created_at desc;
$$;
