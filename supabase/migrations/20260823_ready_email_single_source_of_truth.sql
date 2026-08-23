-- ADR-0106: single source of truth for the "your mystery is ready" customer email.
--
-- Previously this email lived as 12 duplicated HTTP modules inside the Parent
-- Make.com blueprint, each gated by its own copy of a "has empty characters,
-- retry, recheck" sub-flow. That retry logic raced against the separate,
-- more careful notify-generation-issue recovery system (attempt-capped,
-- spend-capped, audited) without either being aware of the other -- causing
-- both a duplicate customer email and roughly double the generation time
-- and Anthropic spend on any package that hit an initially-empty character.
--
-- This migration moves the send to a single DB trigger that fires exactly
-- once per package, on the transition into generation_status.status =
-- 'completed', regardless of which code path (Parent's own write,
-- promote_complete_packages(), heal_completed_packages(), or any future
-- recovery path) caused it.

ALTER TABLE public.mystery_packages
  ADD COLUMN IF NOT EXISTS ready_email_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.notify_package_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w';
BEGIN
  -- Fire only on a genuine transition into 'completed' (OLD is NULL on
  -- INSERT, so IS DISTINCT FROM handles both INSERT and UPDATE), and only
  -- if this row hasn't already claimed the send. Setting NEW.ready_email_sent_at
  -- here (BEFORE trigger, mutating NEW) needs no follow-up UPDATE and can't
  -- recurse -- Postgres's normal row-level locking means a concurrent second
  -- transition for the same row blocks until this one commits, then re-reads
  -- the now-committed ready_email_sent_at and correctly no-ops.
  IF NEW.generation_status->>'status' = 'completed'
     AND (TG_OP = 'INSERT' OR OLD.generation_status->>'status' IS DISTINCT FROM 'completed')
     AND NEW.ready_email_sent_at IS NULL
  THEN
    NEW.ready_email_sent_at := now();

    PERFORM net.http_post(
      url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/send-mystery-ready-email',
      body := jsonb_build_object('package_id', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _anon_key,
        'apikey', _anon_key
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_package_ready ON public.mystery_packages;
CREATE TRIGGER trg_notify_package_ready
  BEFORE INSERT OR UPDATE ON public.mystery_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_package_ready();
