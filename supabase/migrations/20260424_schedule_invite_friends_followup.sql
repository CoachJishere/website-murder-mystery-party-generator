-- Extend schedule_followup_emails to also schedule an 'invite_friends' email
-- 14 days after generation completes (arrives a week before the existing
-- Trustpilot ask, while the host's party is freshest in mind).
CREATE OR REPLACE FUNCTION public.schedule_followup_emails()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conv_record RECORD;
BEGIN
  IF OLD.generation_completed_at IS NULL AND NEW.generation_completed_at IS NOT NULL THEN
    SELECT id, user_id INTO conv_record FROM public.conversations WHERE id = NEW.conversation_id;
    IF conv_record IS NOT NULL AND conv_record.user_id IS NOT NULL THEN
      INSERT INTO public.followup_emails (conversation_id, user_id, email_type, scheduled_for)
      VALUES (NEW.conversation_id, conv_record.user_id, 'how_did_it_go', NOW() + INTERVAL '21 days')
      ON CONFLICT (conversation_id, email_type) DO NOTHING;

      INSERT INTO public.followup_emails (conversation_id, user_id, email_type, scheduled_for)
      VALUES (NEW.conversation_id, conv_record.user_id, 'invite_friends', NOW() + INTERVAL '14 days')
      ON CONFLICT (conversation_id, email_type) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
