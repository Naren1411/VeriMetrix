/* Keep application creation, workflow history, and document checks in one transaction. */

CREATE OR REPLACE FUNCTION public.submit_application(payload jsonb)
RETURNS public.verification_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  INSERT INTO public.verification_applications (
    application_number,
    applicant_name,
    email,
    phone,
    organization,
    applicant_type,
    address,
    state,
    district,
    office,
    officer_name,
    instrument_category,
    instrument_type,
    manufacturer,
    model_number,
    serial_number,
    capacity_range,
    installation_location,
    purpose,
    document_names,
    status
  )
  VALUES (
    payload ->> 'application_number',
    payload ->> 'applicant_name',
    payload ->> 'email',
    payload ->> 'phone',
    payload ->> 'organization',
    payload ->> 'applicant_type',
    payload ->> 'address',
    payload ->> 'state',
    payload ->> 'district',
    payload ->> 'office',
    payload ->> 'officer_name',
    payload ->> 'instrument_category',
    payload ->> 'instrument_type',
    payload ->> 'manufacturer',
    payload ->> 'model_number',
    payload ->> 'serial_number',
    payload ->> 'capacity_range',
    payload ->> 'installation_location',
    payload ->> 'purpose',
    submitted_documents,
    'Submitted'
  )
  RETURNING * INTO application_record;

  INSERT INTO public.workflow_events (
    application_id,
    event_type,
    event_label,
    actor_name,
    event_status,
    notes
  )
  VALUES
    (
      application_record.id,
      'submission',
      'Application Submitted',
      application_record.applicant_name,
      'Completed',
      format('Application submitted through online portal with %s document(s).', cardinality(submitted_documents))
    ),
    (
      application_record.id,
      'routing',
      'Jurisdiction Routing',
      'System',
      'Completed',
      format('Routed to %s based on installation address in %s, %s.', application_record.office, application_record.district, application_record.state)
    );

  INSERT INTO public.document_checks (
    application_id,
    document_name,
    check_type,
    status,
    details
  )
  SELECT
    application_record.id,
    document_name,
    'presence',
    'passed',
    'Document selected in the application submission.'
  FROM unnest(submitted_documents) AS selected(document_name);

  INSERT INTO public.document_checks (
    application_id,
    document_name,
    check_type,
    status,
    details
  )
  SELECT
    application_record.id,
    required.document_name,
    'missing-file',
    'needs_attention',
    'Required document was not selected during submission.'
  FROM unnest(ARRAY['GST Certificate.pdf', 'Manufacturer Certificate.pdf', 'Invoice.pdf']::text[]) AS required(document_name)
  WHERE NOT (required.document_name = ANY(submitted_documents));

  INSERT INTO public.document_checks (
    application_id,
    document_name,
    check_type,
    status,
    details
  )
  VALUES (
    application_record.id,
    'Application form',
    'serial-number-match',
    'needs_attention',
    'OCR comparison will run when binary document storage is connected; applicant serial recorded as ' || application_record.serial_number || '.'
  );

  RETURN application_record;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_application(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_application(jsonb) TO anon, authenticated;
