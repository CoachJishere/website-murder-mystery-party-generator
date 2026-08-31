-- ADR-0106 Addendum 3: trg_notify_package_ready and trg_validate_package_characters
-- (ADR-0108) are both same-phase BEFORE row-level triggers on mystery_packages.
-- Postgres fires same-phase triggers on the same table in alphabetical order by
-- trigger name — this codebase already manages that deliberately elsewhere
-- (trg_00_normalize_generation_status runs first, trg_zz_maintain_needs_review_at
-- runs last), but trg_notify_package_ready was never named with that in mind, and
-- "notify" sorts before "validate". So on any write that ATTEMPTS
-- generation_status.status = 'completed' for a package still missing content,
-- the ready-email trigger ran first, read the pre-correction 'completed' value
-- at face value, and fired the customer email — before the validation trigger
-- got a chance to correct it back to 'needs_review'. Confirmed live: Hannah
-- Winter's second mystery got its "ready" email ~95s before the package
-- actually finished.
--
-- Pure rename, no logic change: sorts trg_notify_package_ready to run AFTER
-- trg_validate_package_characters, so it always reads the post-validation value.
--
-- See docs/adr/0106-single-source-of-truth-ready-notification.md Addendum 3.

ALTER TRIGGER trg_notify_package_ready ON public.mystery_packages
  RENAME TO trg_z_notify_package_ready;
