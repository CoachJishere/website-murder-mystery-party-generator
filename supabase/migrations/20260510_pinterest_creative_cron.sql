-- Schedule fill-pinterest-creative Edge Function to run every 30 minutes.
-- Picks up draft pinterest_pins rows, calls Claude API to generate creative,
-- flips them to status='approved' so the daily image-gen job picks them up.
--
-- Auth: pg_net.http_post passes the service role key as Bearer token.
-- The key is read from supabase_vault.decrypted_secrets at execution time —
-- you must run this ONCE before scheduling:
--
--   SELECT vault.create_secret(
--     '<paste-your-SUPABASE_SERVICE_ROLE_KEY-here>',
--     'service_role_key'
--   );

select cron.schedule(
  'fill-pinterest-creative',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/fill-pinterest-creative',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
