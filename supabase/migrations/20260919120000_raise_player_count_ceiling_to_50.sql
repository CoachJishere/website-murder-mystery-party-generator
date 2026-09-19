-- ADR-0126: raise the hard player_count ceiling from 32 to 50.
--
-- 32 was never a deliberate hard limit — it was the setup form's original
-- default max, later drifted to 35 in the form/marketing copy without the
-- DB constraint following. Customers who negotiate a larger roster during
-- concept chat (a real wedding party going 32 -> 38, ADR-0103 sweep
-- 2026-09-19) hit this constraint when the webhook-trigger tries to sync
-- conversations.player_count to the actual generated roster size, and the
-- sync fails silently (logged only as a warning). Separately, any NEW
-- customer entering 33-35 players on the setup form (which the form itself
-- validates as allowed) would have their conversation row insert rejected
-- outright by this same constraint.
--
-- 50 is a generous technical ceiling chosen to stop this class of failure
-- for realistic large-party requests while still bounding runaway/abusive
-- roster sizes (flat pricing means an unbounded roster is pure cost with no
-- offsetting revenue). The customer-facing UI/marketing cap stays at 35 —
-- this migration only widens the backend safety valve.
alter table conversations drop constraint conversations_player_count_check;
alter table conversations add constraint conversations_player_count_check
  check (player_count >= 4 and player_count <= 50);
