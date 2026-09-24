/* Store an externally generated asymmetric signature during certificate issuance. */

DROP FUNCTION IF EXISTS public.issue_signed_certificate(uuid, date);

CREATE OR REPLACE FUNCTION public.issue_signed_certificate(
  application_id_input uuid,
  valid_until_input date,
  signature_input text
)
RETURNS public.certificate_records
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE app public.verification_applications; result public.certificate_records; cert_id text; payload text; digest_value text; actor text;
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role') NOT IN ('officer', 'admin') THEN RAISE EXCEPTION 'Officer authorization required'; END IF;
  IF signature_input IS NULL OR length(signature_input) < 32 THEN RAISE EXCEPTION 'Asymmetric certificate signature is required'; END IF;
  SELECT * INTO app FROM public.verification_applications WHERE id = application_id_input FOR UPDATE;
  IF app.id IS NULL OR app.status <> 'Inspection Completed' THEN RAISE EXCEPTION 'Inspection must be completed before certification'; END IF;
  cert_id := 'VMX-CERT-' || upper(left(app.state, 3)) || '-' || substr(md5(gen_random_uuid()::text), 1, 12);
  actor := COALESCE(auth.jwt() ->> 'email', 'Authorized officer');
  payload := concat(app.id, '|', app.serial_number, '|', valid_until_input, '|', COALESCE(auth.jwt() ->> 'email', ''));
  digest_value := encode(extensions.digest(payload, 'sha256'), 'hex');
  INSERT INTO public.certificate_records(application_id, certificate_id, status, verified_on, valid_until, issued_by, certificate_hash, signature)
  VALUES (app.id, cert_id, 'VALID', current_date, valid_until_input, actor, digest_value, signature_input)
  RETURNING * INTO result;
  PERFORM public.transition_application(app.id, 'Certificate Issued', 'certificate', 'Certificate Issued', 'Asymmetrically signed certificate issued by ' || actor);
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_signed_certificate(uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_signed_certificate(uuid, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.public_verify_certificate(certificate_id_input text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT COALESCE((SELECT jsonb_build_object(
    'id', c.id, 'certificate_id', c.certificate_id,
    'status', CASE WHEN c.status = 'VALID' AND c.valid_until < current_date THEN 'EXPIRED' ELSE c.status END,
    'verified_on', c.verified_on, 'valid_until', c.valid_until, 'issued_by', c.issued_by,
    'certificate_hash', c.certificate_hash, 'signature', c.signature,
    'signature_present', c.signature IS NOT NULL AND length(c.signature) >= 32,
    'revoked_at', c.revoked_at, 'revocation_reason', c.revocation_reason,
    'application', jsonb_build_object(
      'instrument_type', a.instrument_type, 'instrument_category', a.instrument_category,
      'manufacturer', a.manufacturer, 'model_number', a.model_number,
      'serial_number', a.serial_number, 'applicant_name', a.applicant_name,
      'organization', a.organization, 'installation_location', a.installation_location
    )) FROM public.certificate_records c
    JOIN public.verification_applications a ON a.id = c.application_id
    WHERE upper(c.certificate_id) = upper(certificate_id_input)), '{}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.public_verify_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_verify_certificate(text) TO anon, authenticated;
