/* Durable scheduling, inspection, notification, AI-check, jurisdiction, and audit records. */

CREATE TABLE IF NOT EXISTS public.jurisdiction_officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  district text NOT NULL,
  office text NOT NULL,
  officer_name text NOT NULL,
  email text,
  active boolean NOT NULL DEFAULT true,
  UNIQUE (state, district, officer_name)
);

CREATE TABLE IF NOT EXISTS public.inspection_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  inspector_name text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time NOT NULL,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'Scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  category text NOT NULL,
  responses jsonb NOT NULL DEFAULT '{}',
  outcome text NOT NULL DEFAULT 'Pending',
  remarks text,
  submitted_by text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'in-app',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  check_type text NOT NULL,
  status text NOT NULL,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status text,
  to_status text,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_applications ADD COLUMN IF NOT EXISTS correction_reason text;
ALTER TABLE public.verification_applications ADD COLUMN IF NOT EXISTS ai_document_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.certificate_records ADD COLUMN IF NOT EXISTS verification_url text;

ALTER TABLE public.jurisdiction_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public jurisdiction read" ON public.jurisdiction_officers;
CREATE POLICY "Public jurisdiction read" ON public.jurisdiction_officers FOR SELECT TO anon, authenticated USING (active = true);

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['inspection_schedules','inspection_checklists','notifications','document_checks','audit_logs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public %s access" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Public %s access" ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', table_name, table_name);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS inspection_schedules_application_idx ON public.inspection_schedules(application_id);
CREATE INDEX IF NOT EXISTS inspection_schedules_date_idx ON public.inspection_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS audit_logs_application_idx ON public.audit_logs(application_id, created_at);
