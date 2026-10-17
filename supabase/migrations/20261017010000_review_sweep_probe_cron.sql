-- ADR-0168 (2026-10-17): whole-package "sweeper" pass, SHADOW window. Jonathan approved a window of 5 packages (about 2.5 to 5 USD); the first package
-- ("Praline/Pralene Frost", 4bfc800b) was swept by hand-triggered call and a calibration replay of The Enthusiasts was run, so 4 packages remain.
-- pipeline_settings.review_sweep_probe is a COUNT of packages still allowed to run (absent, 0 or anything else = off). The edge function decrements it
-- BEFORE each paid call, so a crash can never run more packages than were approved. The cron below only asks for the next package; with the count at 0
-- it returns immediately and spends nothing.
INSERT INTO public.pipeline_settings (key, value) VALUES ('review_sweep_probe', '4')
ON CONFLICT (key) DO NOTHING;

SELECT cron.schedule(
  'review-sweep-probe',
  '2-59/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/review-package-quality',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'sweep_next'),
    timeout_milliseconds := 280000
  );
  $cron$
);
