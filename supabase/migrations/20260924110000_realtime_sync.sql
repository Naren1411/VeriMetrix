/* Keep timestamps and hosted clients synchronized as workflow data changes. */

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verification_applications_set_updated_at ON public.verification_applications;
CREATE TRIGGER verification_applications_set_updated_at
  BEFORE UPDATE ON public.verification_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.verification_applications;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_events;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.certificate_records;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END
$$;
