-- ADR-0169 (2026-10-17): European vs Brazilian Portuguese.
-- profiles.language_region: 'pt-PT' or 'pt-BR' from the browser's language list (written by AuthContext only when the browser says which one).
-- conversations.language_variant: the variant a package was generated in, written by mystery-webhook-trigger when it starts generation and read by the
-- label-conformity and scaffold-localization heals (null for every other language and every package generated before this; null keeps the Brazilian tables).
-- pipeline_settings.portuguese_variants: 'off' (default) keeps today's behaviour exactly; 'on' lets the trigger send "European Portuguese" for a pt-PT
-- customer (and for an unknown region), "Portuguese" (Brazilian) for pt-BR. Turn it on only after Child69 (the European label pack) is imported in Make.
alter table public.profiles add column if not exists language_region text;
alter table public.conversations add column if not exists language_variant text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_language_region_check') then
    alter table public.profiles add constraint profiles_language_region_check check (language_region is null or language_region in ('pt-PT', 'pt-BR'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'conversations_language_variant_check') then
    alter table public.conversations add constraint conversations_language_variant_check check (language_variant is null or language_variant in ('pt-PT', 'pt-BR'));
  end if;
end $$;

insert into public.pipeline_settings (key, value) values ('portuguese_variants', 'off') on conflict (key) do nothing;
