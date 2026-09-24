/* Require a second applicant-owned secret before exposing tracking details. */

REVOKE ALL ON FUNCTION public.public_track_application(text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION IF EXISTS public.public_track_application(text);

CREATE OR REPLACE FUNCTION public.public_track_application(
  application_number_input text,
  email_input text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'id', a.id,
        'application_number', a.application_number,
        'applicant_name', a.applicant_name,
        'organization', a.organization,
        'applicant_type', a.applicant_type,
        'email', a.email,
        'phone', a.phone,
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
        AND lower(trim(a.email)) = lower(trim(email_input))
    ), '{}'::jsonb
  );
$$;

REVOKE ALL ON FUNCTION public.public_track_application(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_track_application(text, text) TO anon, authenticated;
