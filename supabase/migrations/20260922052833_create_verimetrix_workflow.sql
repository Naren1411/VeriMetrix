/*
# Create VeriMetrix workflow data

1. New Tables
- `verification_applications`: Public demo applications with applicant, instrument, jurisdiction, workflow status, and submitted document names.
- `certificate_records`: Digital certificate records linked to applications for public certificate lookup.
- `workflow_events`: Timestamped workflow audit entries used to show application history.

2. Security
- Row-level security is enabled on every table.
- This first demonstration is intentionally single-tenant and has no sign-in requirement, so the public portal can create and track demo records with the anon key.
- Separate SELECT, INSERT, UPDATE, and DELETE policies are provided for anon and authenticated roles.

3. Important Notes
- Document names are stored for the prototype; binary storage can be added when production document storage is connected.
- Certificate lookup is intentionally public because QR verification must work without an account.
*/

CREATE TABLE IF NOT EXISTS public.verification_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number text UNIQUE NOT NULL,
  applicant_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization text NOT NULL,
  applicant_type text NOT NULL,
  address text NOT NULL,
  state text NOT NULL,
  district text NOT NULL,
  office text NOT NULL,
  officer_name text NOT NULL,
  instrument_category text NOT NULL,
  instrument_type text NOT NULL,
  manufacturer text NOT NULL,
  model_number text NOT NULL,
  serial_number text NOT NULL,
  capacity_range text NOT NULL,
  installation_location text NOT NULL,
  purpose text NOT NULL,
  document_names text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'Submitted',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.certificate_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  certificate_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'VALID',
  verified_on date NOT NULL DEFAULT current_date,
  valid_until date NOT NULL,
  issued_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_label text NOT NULL,
  actor_name text NOT NULL,
  event_status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read verification applications" ON public.verification_applications;
CREATE POLICY "Public can read verification applications" ON public.verification_applications FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create verification applications" ON public.verification_applications;
CREATE POLICY "Public can create verification applications" ON public.verification_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update verification applications" ON public.verification_applications;
CREATE POLICY "Public can update verification applications" ON public.verification_applications FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete verification applications" ON public.verification_applications;
CREATE POLICY "Public can delete verification applications" ON public.verification_applications FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read certificate records" ON public.certificate_records;
CREATE POLICY "Public can read certificate records" ON public.certificate_records FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create certificate records" ON public.certificate_records;
CREATE POLICY "Public can create certificate records" ON public.certificate_records FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update certificate records" ON public.certificate_records;
CREATE POLICY "Public can update certificate records" ON public.certificate_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete certificate records" ON public.certificate_records;
CREATE POLICY "Public can delete certificate records" ON public.certificate_records FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public can read workflow events" ON public.workflow_events;
CREATE POLICY "Public can read workflow events" ON public.workflow_events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public can create workflow events" ON public.workflow_events;
CREATE POLICY "Public can create workflow events" ON public.workflow_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Public can update workflow events" ON public.workflow_events;
CREATE POLICY "Public can update workflow events" ON public.workflow_events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public can delete workflow events" ON public.workflow_events;
CREATE POLICY "Public can delete workflow events" ON public.workflow_events FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS verification_applications_status_idx ON public.verification_applications(status);
CREATE INDEX IF NOT EXISTS verification_applications_district_idx ON public.verification_applications(district);
CREATE INDEX IF NOT EXISTS certificate_records_certificate_id_idx ON public.certificate_records(certificate_id);
CREATE INDEX IF NOT EXISTS workflow_events_application_id_idx ON public.workflow_events(application_id);
