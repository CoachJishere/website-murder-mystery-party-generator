-- ADR-0065: split the character-style "final statement" into a Final-Statements-round
-- denial (repurposing the existing final_guilty/final_accomplice fields) and a new
-- Reveal-round confession, so a guilty/accomplice player always has an exact scripted
-- line for both moments — no improvisation required at either round, at any script_type.
--
-- final_guilty/final_accomplice keep their column names but change MEANING going forward
-- (confession -> denial/defense); existing rows retain their old confession-style content
-- until regenerated. See docs/adr/0065-... for full context.

alter table mystery_characters
  add column if not exists reveal_confession_guilty text,
  add column if not exists reveal_confession_guilty_pointform text,
  add column if not exists reveal_confession_accomplice text,
  add column if not exists reveal_confession_accomplice_pointform text;
