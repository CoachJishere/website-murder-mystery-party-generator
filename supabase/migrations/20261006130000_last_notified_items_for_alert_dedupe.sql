-- 2026-10-06: notify-generation-issue stops re-emailing the same unresolved problem every 6 hours. It now stores the set of issue items it
-- last emailed about and emails only when the current set contains something new (_shared/alert-dedupe.ts). NULL on existing rows is
-- handled in code as "already told" when last_notified_at is set, so this causes no extra email per held package.
ALTER TABLE public.mystery_packages ADD COLUMN IF NOT EXISTS last_notified_items text[];
COMMENT ON COLUMN public.mystery_packages.last_notified_items IS 'Issue items covered by the last generation-issue alert email; a new email goes out only for items not in this set.';
