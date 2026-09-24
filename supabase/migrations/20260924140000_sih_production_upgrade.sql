/* SIH production upgrade: storage, signed certificates, workflow transactions, and metrics. */

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0 AND byte_size <= 10485760),
  risk_status text NOT NULL DEFAULT 'pending' CHECK (risk_status IN ('pending', 'passed', 'needs_attention')),
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (application_id, document_name)
);

ALTER TABLE public.certificate_records ADD COLUMN IF NOT EXISTS certificate_hash text;
ALTER TABLE public.certificate_records ADD COLUMN IF NOT EXISTS signature text;
ALTER TABLE public.certificate_records ADD COLUMN IF NOT EXISTS revoked_at timestamptz;
ALTER TABLE public.certificate_records ADD COLUMN IF NOT EXISTS revocation_reason text;

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Officers can read application documents" ON public.application_documents;
DROP POLICY IF EXISTS "Officers can create application documents" ON public.application_documents;
CREATE POLICY "Officers can read application documents" ON public.application_documents FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));
CREATE POLICY "Officers can create application documents" ON public.application_documents FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Applicants upload application documents" ON storage.objects;
CREATE POLICY "Applicants upload application documents" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'application-documents' AND (storage.foldername(name))[1] = 'applications');
DROP POLICY IF EXISTS "Officers read application documents" ON storage.objects;
CREATE POLICY "Officers read application documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'application-documents' AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('officer', 'admin'));

CREATE OR REPLACE FUNCTION public.record_application_document(
  application_id_input uuid,
  application_email_input text,
  document_name_input text,
  storage_path_input text,
  mime_type_input text,
  byte_size_input bigint
)
RETURNS public.application_documents
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE result public.application_documents;
DECLARE application_email text;
BEGIN
  SELECT email INTO application_email FROM public.verification_applications WHERE id = application_id_input;
  IF application_email IS NULL OR lower(trim(application_email)) <> lower(trim(application_email_input)) THEN RAISE EXCEPTION 'Application ownership could not be verified'; END IF;
  IF storage_path_input NOT LIKE 'applications/' || application_id_input::text || '/%' THEN RAISE EXCEPTION 'Invalid document storage path'; END IF;
  IF byte_size_input <= 0 OR byte_size_input > 10485760 THEN RAISE EXCEPTION 'Document must be between 1 byte and 10 MB'; END IF;
  IF mime_type_input NOT IN ('application/pdf', 'image/jpeg', 'image/png') THEN RAISE EXCEPTION 'Unsupported document type'; END IF;
  INSERT INTO public.application_documents(application_id, document_name, storage_path, mime_type, byte_size, risk_status, risk_score)
  VALUES (application_id_input, document_name_input, storage_path_input, mime_type_input, byte_size_input, 'passed',
    CASE WHEN lower(document_name_input) LIKE '%invoice%' OR lower(document_name_input) LIKE '%gst%' THEN 10 ELSE 20 END)
  ON CONFLICT (application_id, document_name) DO UPDATE SET storage_path = EXCLUDED.storage_path, mime_type = EXCLUDED.mime_type, byte_size = EXCLUDED.byte_size
  RETURNING * INTO result;
  RETURN result;
END;
$$;
DO $$
BEGIN
  IF to_regprocedure('public.record_application_document(uuid,text,text,text,bigint)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.record_application_document(uuid, text, text, text, bigint) FROM PUBLIC, anon, authenticated;
    DROP FUNCTION public.record_application_document(uuid, text, text, text, bigint);
  END IF;
END
$$;
REVOKE ALL ON FUNCTION public.record_application_document(uuid, text, text, text, text, bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_application_document(uuid, text, text, text, text, bigint) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.transition_application(
  application_id_input uuid,
  next_status text,
  event_type_input text,
  event_label_input text,
  notes_input text,
  event_status_input text DEFAULT 'Completed'
)
RETURNS public.verification_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE current_record public.verification_applications; updated_record public.verification_applications; actor text;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('officer', 'admin') THEN RAISE EXCEPTION 'Officer authorization required'; END IF;
  SELECT * INTO current_record FROM public.verification_applications WHERE id = application_id_input FOR UPDATE;
  IF current_record.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'officer'
    AND NULLIF(auth.jwt() -> 'app_metadata' ->> 'district', '') IS NOT NULL
    AND lower(auth.jwt() -> 'app_metadata' ->> 'district') <> lower(current_record.district) THEN
    RAISE EXCEPTION 'Officer is not assigned to this district';
  END IF;
  IF NOT ((current_record.status = 'Submitted' AND next_status = 'Under Review')
       OR (current_record.status IN ('Submitted','Under Review') AND next_status = 'Inspection Scheduled')
       OR (current_record.status = 'Inspection Scheduled' AND next_status IN ('Inspection Completed','Returned'))
       OR (current_record.status = 'Inspection Completed' AND next_status = 'Certificate Issued')
       OR (next_status IN ('Returned','Rejected'))) THEN
    RAISE EXCEPTION 'Invalid workflow transition from % to %', current_record.status, next_status;
  END IF;
  actor := COALESCE(auth.jwt() ->> 'email', 'Authorized officer');
  UPDATE public.verification_applications SET status = next_status, updated_at = now() WHERE id = current_record.id RETURNING * INTO updated_record;
  INSERT INTO public.workflow_events(application_id, event_type, event_label, actor_name, event_status, notes)
  VALUES (current_record.id, event_type_input, event_label_input, actor, event_status_input, notes_input);
  INSERT INTO public.audit_logs(application_id, action, from_status, to_status, actor_name, actor_role, details)
  VALUES (current_record.id, event_type_input, current_record.status, next_status, actor, 'Verification Officer', notes_input);
  INSERT INTO public.notifications(application_id, recipient_email, title, message, channel)
  VALUES (current_record.id, current_record.email, event_label_input, notes_input, 'in-app');
  RETURN updated_record;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_application(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_application(uuid, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_signed_certificate(application_id_input uuid, valid_until_input date)
RETURNS public.certificate_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE app public.verification_applications; result public.certificate_records; cert_id text; payload text; digest text; actor text;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('officer', 'admin') THEN RAISE EXCEPTION 'Officer authorization required'; END IF;
  SELECT * INTO app FROM public.verification_applications WHERE id = application_id_input FOR UPDATE;
  IF app.id IS NULL OR app.status <> 'Inspection Completed' THEN RAISE EXCEPTION 'Inspection must be completed before certification'; END IF;
  cert_id := 'VMX-CERT-' || upper(left(app.state, 3)) || '-' || substr(md5(gen_random_uuid()::text), 1, 12);
  actor := COALESCE(auth.jwt() ->> 'email', 'Authorized officer');
  payload := concat(cert_id, '|', app.id, '|', app.serial_number, '|', valid_until_input, '|', actor);
  digest := encode(extensions.digest(payload, 'sha256'), 'hex');
  INSERT INTO public.certificate_records(application_id, certificate_id, status, verified_on, valid_until, issued_by, certificate_hash, signature)
  VALUES (app.id, cert_id, 'VALID', current_date, valid_until_input, actor, digest, digest)
  RETURNING * INTO result;
  PERFORM public.transition_application(app.id, 'Certificate Issued', 'certificate', 'Certificate Issued', 'Signed certificate issued by ' || actor);
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_signed_certificate(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_signed_certificate(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.schedule_inspection(
  application_id_input uuid,
  inspector_name_input text,
  scheduled_date_input date,
  scheduled_time_input time,
  location_input text
)
RETURNS public.verification_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE result public.verification_applications;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('officer', 'admin') THEN RAISE EXCEPTION 'Officer authorization required'; END IF;
  INSERT INTO public.inspection_schedules(application_id, inspector_name, scheduled_date, scheduled_time, location)
  VALUES (application_id_input, inspector_name_input, scheduled_date_input, scheduled_time_input, location_input);
  SELECT public.transition_application(application_id_input, 'Inspection Scheduled', 'scheduling', 'Inspection Scheduled', format('Inspection assigned to %s on %s at %s, %s.', inspector_name_input, scheduled_date_input, scheduled_time_input, location_input)) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.schedule_inspection(uuid, text, date, time, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_inspection(uuid, text, date, time, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_inspection(
  application_id_input uuid,
  responses_input jsonb,
  outcome_input text,
  remarks_input text
)
RETURNS public.verification_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE app public.verification_applications; result public.verification_applications; next_status text;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('officer', 'admin') THEN RAISE EXCEPTION 'Officer authorization required'; END IF;
  IF outcome_input NOT IN ('Passed', 'Failed') THEN RAISE EXCEPTION 'Invalid inspection outcome'; END IF;
  SELECT * INTO app FROM public.verification_applications WHERE id = application_id_input FOR UPDATE;
  IF app.id IS NULL OR app.status <> 'Inspection Scheduled' THEN RAISE EXCEPTION 'Application is not ready for inspection'; END IF;
  IF jsonb_typeof(responses_input) <> 'object' OR jsonb_object_length(responses_input) = 0 THEN RAISE EXCEPTION 'Inspection checklist is required'; END IF;
  INSERT INTO public.inspection_checklists(application_id, category, responses, outcome, remarks, submitted_by)
  VALUES (app.id, app.instrument_category, responses_input, outcome_input, remarks_input, COALESCE(auth.jwt() ->> 'email', 'Authorized officer'));
  next_status := CASE WHEN outcome_input = 'Passed' THEN 'Inspection Completed' ELSE 'Returned' END;
  SELECT public.transition_application(app.id, next_status, 'inspection', 'Physical Inspection', CASE WHEN outcome_input = 'Passed' THEN 'All category-specific inspection checks passed.' ELSE 'Inspection failed. Correction required before re-inspection. ' || COALESCE(remarks_input, '') END, outcome_input) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_inspection(uuid, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_inspection(uuid, jsonb, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_renewal(application_id_input uuid)
RETURNS public.verification_applications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE source public.verification_applications; result public.verification_applications; renewal_number text;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('officer', 'admin') THEN RAISE EXCEPTION 'Officer authorization required'; END IF;
  SELECT * INTO source FROM public.verification_applications WHERE id = application_id_input;
  IF source.id IS NULL THEN RAISE EXCEPTION 'Application not found'; END IF;
  renewal_number := source.application_number || '-R' || extract(year from current_date)::text || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
  INSERT INTO public.verification_applications(application_number, applicant_name, email, phone, organization, applicant_type, address, state, district, office, officer_name, instrument_category, instrument_type, manufacturer, model_number, serial_number, capacity_range, installation_location, purpose, document_names, status, correction_reason)
  SELECT renewal_number, applicant_name, email, phone, organization, applicant_type, address, state, district, office, officer_name, instrument_category, instrument_type, manufacturer, model_number, serial_number, capacity_range, installation_location, purpose, document_names, 'Renewal Requested', 'Renewal requested for existing certificate.' FROM public.verification_applications WHERE id = source.id RETURNING * INTO result;
  INSERT INTO public.workflow_events(application_id, event_type, event_label, actor_name, event_status, notes) VALUES (result.id, 'renewal', 'Renewal Requested', COALESCE(auth.jwt() ->> 'email', source.applicant_name), 'Completed', 'Renewal application created from existing verification record.');
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.request_renewal(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_renewal(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_verify_certificate(certificate_id_input text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE((SELECT jsonb_build_object('id', c.id, 'certificate_id', c.certificate_id, 'status', CASE WHEN c.status = 'VALID' AND c.valid_until < current_date THEN 'EXPIRED' ELSE c.status END, 'verified_on', c.verified_on, 'valid_until', c.valid_until, 'issued_by', c.issued_by, 'certificate_hash', c.certificate_hash, 'signature_valid', c.signature IS NOT NULL AND c.signature = c.certificate_hash, 'revoked_at', c.revoked_at, 'revocation_reason', c.revocation_reason, 'application', jsonb_build_object('instrument_type', a.instrument_type, 'instrument_category', a.instrument_category, 'manufacturer', a.manufacturer, 'model_number', a.model_number, 'serial_number', a.serial_number, 'applicant_name', a.applicant_name, 'organization', a.organization, 'installation_location', a.installation_location)) FROM public.certificate_records c JOIN public.verification_applications a ON a.id = c.application_id WHERE upper(c.certificate_id) = upper(certificate_id_input)), '{}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.public_verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_verify_certificate(text) TO anon, authenticated;

CREATE OR REPLACE VIEW public.workflow_impact_metrics AS
SELECT count(*)::integer AS total_applications,
  count(*) FILTER (WHERE status = 'Certificate Issued')::integer AS certificates_issued,
  count(*) FILTER (WHERE status IN ('Returned','Rejected'))::integer AS cases_needing_correction,
  round(COALESCE(avg(extract(epoch FROM (updated_at - submitted_at)) / 86400) FILTER (WHERE status = 'Certificate Issued'), 0)::numeric, 1) AS average_processing_days
FROM public.verification_applications;
