/* Final security lockdown for public and officer workflow access. */

DO $$
BEGIN
  IF to_regprocedure('public.public_track_application(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.public_track_application(text) SET search_path = public, pg_temp';
  END IF;
  IF to_regprocedure('public.public_verify_certificate(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.public_verify_certificate(text) SET search_path = public, pg_temp';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.submit_application(payload jsonb)
RETURNS public.verification_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  application_record public.verification_applications;
  submitted_documents text[] := COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(payload -> 'document_names', '[]'::jsonb))
    ),
    ARRAY[]::text[]
  );
BEGIN
  IF jsonb_typeof(payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid application payload';
  END IF;

  IF length(COALESCE(payload ->> 'application_number', '')) NOT BETWEEN 8 AND 80
    OR payload ->> 'application_number' !~ '^[A-Z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid application number';
  END IF;

  IF length(COALESCE(payload ->> 'applicant_name', '')) NOT BETWEEN 2 AND 160
    OR length(COALESCE(payload ->> 'email', '')) NOT BETWEEN 5 AND 254
    OR length(COALESCE(payload ->> 'phone', '')) NOT BETWEEN 7 AND 30 THEN
    RAISE EXCEPTION 'Invalid applicant details';
  END IF;

  IF jsonb_typeof(payload -> 'document_names') <> 'array'
    OR jsonb_array_length(payload -> 'document_names') > 20 THEN
    RAISE EXCEPTION 'Invalid document list';
  END IF;

  INSERT INTO public.verification_applications (
    application_number, applicant_name, email, phone, organization, applicant_type,
    address, state, district, office, officer_name, instrument_category, instrument_type,
    manufacturer, model_number, serial_number, capacity_range, installation_location,
    purpose, document_names, status
  )
  VALUES (
    payload ->> 'application_number', payload ->> 'applicant_name', payload ->> 'email',
    payload ->> 'phone', payload ->> 'organization', payload ->> 'applicant_type',
    payload ->> 'address', payload ->> 'state', payload ->> 'district', payload ->> 'office',
    payload ->> 'officer_name', payload ->> 'instrument_category', payload ->> 'instrument_type',
    payload ->> 'manufacturer', payload ->> 'model_number', payload ->> 'serial_number',
    payload ->> 'capacity_range', payload ->> 'installation_location', payload ->> 'purpose',
    submitted_documents, 'Submitted'
  )
  RETURNING * INTO application_record;

  INSERT INTO public.workflow_events (
    application_id, event_type, event_label, actor_name, event_status, notes
  )
  VALUES
    (
      application_record.id, 'submission', 'Application Submitted', application_record.applicant_name,
      'Completed', format('Application submitted through online portal with %s document(s).', cardinality(submitted_documents))
    ),
    (
      application_record.id, 'routing', 'Jurisdiction Routing', 'System', 'Completed',
      format('Routed to %s based on installation address in %s, %s.', application_record.office, application_record.district, application_record.state)
    );

  INSERT INTO public.document_checks (application_id, document_name, check_type, status, details)
  SELECT application_record.id, document_name, 'presence', 'passed', 'Document selected in the application submission.'
  FROM unnest(submitted_documents) AS selected(document_name);

  INSERT INTO public.document_checks (application_id, document_name, check_type, status, details)
  SELECT application_record.id, required.document_name, 'missing-file', 'needs_attention',
    'Required document was not selected during submission.'
  FROM unnest(ARRAY['GST Certificate.pdf', 'Manufacturer Certificate.pdf', 'Invoice.pdf']::text[]) AS required(document_name)
  WHERE NOT (required.document_name = ANY(submitted_documents));

  INSERT INTO public.document_checks (application_id, document_name, check_type, status, details)
  VALUES (
    application_record.id, 'Application form', 'serial-number-match', 'needs_attention',
    'OCR comparison will run when binary document storage is connected; applicant serial recorded as ' || application_record.serial_number || '.'
  );

  RETURN application_record;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_application(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(jsonb) TO anon, authenticated;

REVOKE ALL ON public.verification_applications, public.certificate_records, public.workflow_events,
  public.jurisdiction_officers, public.inspection_schedules, public.inspection_checklists,
  public.notifications, public.document_checks, public.audit_logs FROM anon;

DROP POLICY IF EXISTS "Public can read verification applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can create verification applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can update verification applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can delete verification applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Public can submit applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Officers can read applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Officers can create applications" ON public.verification_applications;
DROP POLICY IF EXISTS "Officers can update applications" ON public.verification_applications;
CREATE POLICY "Officers can read applications" ON public.verification_applications FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can create applications" ON public.verification_applications FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can update applications" ON public.verification_applications FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

DROP POLICY IF EXISTS "Public can read certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Public can create certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Public can update certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Public can delete certificate records" ON public.certificate_records;
DROP POLICY IF EXISTS "Officers can read certificates" ON public.certificate_records;
DROP POLICY IF EXISTS "Officers can create certificates" ON public.certificate_records;
DROP POLICY IF EXISTS "Officers can update certificates" ON public.certificate_records;
CREATE POLICY "Officers can read certificates" ON public.certificate_records FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can create certificates" ON public.certificate_records FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can update certificates" ON public.certificate_records FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

DROP POLICY IF EXISTS "Public can read workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Public can create workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Public can update workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Public can delete workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Officers can read workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Officers can create workflow events" ON public.workflow_events;
DROP POLICY IF EXISTS "Officers can update workflow events" ON public.workflow_events;
CREATE POLICY "Officers can read workflow events" ON public.workflow_events FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can create workflow events" ON public.workflow_events FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can update workflow events" ON public.workflow_events FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'jurisdiction_officers', 'inspection_schedules', 'inspection_checklists',
    'notifications', 'document_checks', 'audit_logs'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public jurisdiction read" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated staff can read jurisdiction" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Public %s access" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Staff %s read" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Staff %s write" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Officers can read %s" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Officers can create %s" ON public.%I', table_name, table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Officers can update %s" ON public.%I', table_name, table_name);
    EXECUTE format('CREATE POLICY "Officers can read %s" ON public.%I FOR SELECT TO authenticated USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''officer'', ''admin''))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Officers can create %s" ON public.%I FOR INSERT TO authenticated WITH CHECK ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''officer'', ''admin''))', table_name, table_name);
    EXECUTE format('CREATE POLICY "Officers can update %s" ON public.%I FOR UPDATE TO authenticated USING ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''officer'', ''admin'')) WITH CHECK ((auth.jwt() -> ''app_metadata'' ->> ''role'') IN (''officer'', ''admin''))', table_name, table_name);
  END LOOP;
END
$$;
