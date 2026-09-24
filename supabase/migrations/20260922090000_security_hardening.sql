/* Security hardening: public access is limited to explicit workflow entry points. */

CREATE OR REPLACE FUNCTION public.public_track_application(application_number_input text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'id', a.id,
        'application_number', a.application_number,
        'applicant_name', a.applicant_name,
        'organization', a.organization,
        'applicant_type', a.applicant_type,
        'state', a.state,
        'district', a.district,
        'office', a.office,
        'officer_name', a.officer_name,
        'instrument_category', a.instrument_category,
        'instrument_type', a.instrument_type,
        'manufacturer', a.manufacturer,
        'model_number', a.model_number,
        'serial_number', a.serial_number,
        'capacity_range', a.capacity_range,
        'installation_location', a.installation_location,
        'document_names', a.document_names,
        'status', a.status,
        'submitted_at', a.submitted_at,
        'updated_at', a.updated_at,
        'workflow_events', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', e.id,
            'event_type', e.event_type,
            'event_label', e.event_label,
            'actor_name', e.actor_name,
            'event_status', e.event_status,
            'notes', e.notes,
            'created_at', e.created_at
          ) ORDER BY e.created_at)
          FROM public.workflow_events e WHERE e.application_id = a.id
        ), '[]'::jsonb)
      )
      FROM public.verification_applications a
      WHERE upper(a.application_number) = upper(application_number_input)
    ), '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION public.public_verify_certificate(certificate_id_input text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'id', c.id,
        'application_id', c.application_id,
        'certificate_id', c.certificate_id,
        'status', CASE WHEN c.status = 'VALID' AND c.valid_until < current_date THEN 'EXPIRED' ELSE c.status END,
        'verified_on', c.verified_on,
        'valid_until', c.valid_until,
        'issued_by', c.issued_by,
        'verification_url', c.verification_url,
        'application', jsonb_build_object(
          'instrument_type', a.instrument_type,
          'instrument_category', a.instrument_category,
          'manufacturer', a.manufacturer,
          'model_number', a.model_number,
          'serial_number', a.serial_number,
          'applicant_name', a.applicant_name,
          'organization', a.organization,
          'installation_location', a.installation_location
        )
      )
      FROM public.certificate_records c
      JOIN public.verification_applications a ON a.id = c.application_id
      WHERE upper(c.certificate_id) = upper(certificate_id_input)
    ), '{}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.public_track_application(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_track_application(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_verify_certificate(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read verification applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can update verification applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can delete verification applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can read certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Public can create certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Public can update certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Public can delete certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Public can read workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Public can update workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Public can delete workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Officers can read applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can submit applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Officers can update applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can create certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Officers can read certificates" ON public.certificate_records;
DROP POLICY IF EXISTS "Officers can update certificates" ON public.certificate_records;
DROP POLICY IF EXISTS "Officers can read events" ON public.workflow_events;
DROP POLICY IF EXISTS "Public can create events" ON public.workflow_events;
DROP POLICY IF EXISTS "Officers can update events" ON public.workflow_events;

CREATE POLICY "Officers can read applications" ON public.verification_applications FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Public can submit applications" ON public.verification_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Officers can update applications" ON public.verification_applications FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

CREATE POLICY "Public can create certificate records" ON public.certificate_records FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can read certificates" ON public.certificate_records FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can update certificates" ON public.certificate_records FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

CREATE POLICY "Officers can read events" ON public.workflow_events FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Public can create events" ON public.workflow_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Officers can update events" ON public.workflow_events FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

DROP POLICY IF EXISTS "Public jurisdiction read" ON public.jurisdiction_officers;
DROP POLICY IF EXISTS "Authenticated staff can read jurisdiction" ON public.jurisdiction_officers;
CREATE POLICY "Authenticated staff can read jurisdiction" ON public.jurisdiction_officers FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['inspection_schedules','inspection_checklists','notifications','document_checks','audit_logs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public %s access" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Staff %s read" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Staff %s write" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Staff %s read" ON public.%I FOR SELECT TO authenticated USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''officer'', ''admin''))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Staff %s write" ON public.%I FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''officer'', ''admin''))', table_name, table_name);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Applicants can submit document checks" ON public.document_checks;
CREATE POLICY "Applicants can submit document checks" ON public.document_checks FOR INSERT TO anon, authenticated
  WITH CHECK (true);
