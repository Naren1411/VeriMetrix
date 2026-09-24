/* Deterministic demo records for a clean SIH presentation environment. */

DO $$
DECLARE demo_id uuid; certificate_demo_id uuid; certificate_hash text;
BEGIN
  INSERT INTO public.jurisdiction_officers(state, district, office, officer_name, email)
  VALUES
    ('Maharashtra', 'Pune', 'Office of the Controller of Legal Metrology, Pune', 'Verification Officer, Pune', 'officer.pune@verimetrix.demo'),
    ('Karnataka', 'Bengaluru Urban', 'Office of the Controller of Legal Metrology, Bengaluru Urban', 'Verification Officer, Bengaluru Urban', 'officer.bengaluru@verimetrix.demo')
  ON CONFLICT (state, district, officer_name) DO NOTHING;

  INSERT INTO public.verification_applications(
    application_number, applicant_name, email, phone, organization, applicant_type, address,
    state, district, office, officer_name, instrument_category, instrument_type, manufacturer,
    model_number, serial_number, capacity_range, installation_location, purpose, document_names, status
  )
  VALUES (
    'VMX-DEMO-2026-0001', 'Aarav Foods Pvt Ltd', 'demo.applicant@verimetrix.demo', '9876543210',
    'Aarav Foods Pvt Ltd', 'Manufacturer', 'Industrial Area, Pune', 'Maharashtra', 'Pune',
    'Office of the Controller of Legal Metrology, Pune', 'Verification Officer, Pune',
    'Weighing Instruments', 'Electronic Platform Scale', 'Precision Instruments', 'PI-500',
    'PI-DEMO-0001', '500 kg', 'Aarav Foods Factory, Pune', 'Commercial trade',
    ARRAY['GST Certificate.pdf', 'Manufacturer Certificate.pdf', 'Invoice.pdf'], 'Under Review'
  )
  ON CONFLICT (application_number) DO NOTHING
  RETURNING id INTO demo_id;

  IF demo_id IS NOT NULL THEN
    INSERT INTO public.workflow_events(application_id, event_type, event_label, actor_name, event_status, notes)
    VALUES (demo_id, 'submission', 'Application Submitted', 'Aarav Foods Pvt Ltd', 'Completed', 'Seeded demonstration application.'),
           (demo_id, 'routing', 'Jurisdiction Routing', 'System', 'Completed', 'Routed to Pune jurisdiction.');
    INSERT INTO public.document_checks(application_id, document_name, check_type, status, details)
    VALUES (demo_id, 'GST Certificate.pdf', 'rules', 'passed', 'Required document present.'),
           (demo_id, 'Manufacturer Certificate.pdf', 'rules', 'passed', 'Required document present.'),
           (demo_id, 'Invoice.pdf', 'rules', 'passed', 'Required document present.');
  END IF;

  INSERT INTO public.verification_applications(
    application_number, applicant_name, email, phone, organization, applicant_type, address,
    state, district, office, officer_name, instrument_category, instrument_type, manufacturer,
    model_number, serial_number, capacity_range, installation_location, purpose, document_names, status
  )
  VALUES (
    'VMX-DEMO-2026-0002', 'Kaveri Retail Cooperative', 'demo.certificate@verimetrix.demo', '9876543211',
    'Kaveri Retail Cooperative', 'Trader', 'Market Road, Bengaluru Urban', 'Karnataka', 'Bengaluru Urban',
    'Office of the Controller of Legal Metrology, Bengaluru Urban', 'Verification Officer, Bengaluru Urban',
    'Measuring Instruments', 'Retail Weighing Scale', 'MeasureTech', 'MT-200', 'MT-DEMO-0002', '200 kg',
    'Kaveri Retail Market, Bengaluru', 'Commercial trade',
    ARRAY['GST Certificate.pdf', 'Manufacturer Certificate.pdf', 'Invoice.pdf'], 'Certificate Issued'
  )
  ON CONFLICT (application_number) DO UPDATE SET status = 'Certificate Issued'
  RETURNING id INTO certificate_demo_id;

  IF certificate_demo_id IS NOT NULL THEN
    INSERT INTO public.workflow_events(application_id, event_type, event_label, actor_name, event_status, notes)
    VALUES (certificate_demo_id, 'submission', 'Application Submitted', 'Kaveri Retail Cooperative', 'Completed', 'Seeded certificate demonstration.'),
           (certificate_demo_id, 'inspection', 'Physical Inspection', 'officer.bengaluru@verimetrix.demo', 'Passed', 'All demonstration inspection checks passed.'),
           (certificate_demo_id, 'certificate', 'Certificate Issued', 'officer.bengaluru@verimetrix.demo', 'Completed', 'Signed demonstration certificate issued.');
    certificate_hash := encode(extensions.digest('VMX-CERT-DEMO-2026-0002|' || certificate_demo_id::text || '|MT-DEMO-0002|2030-12-31|officer.bengaluru@verimetrix.demo', 'sha256'), 'hex');
    INSERT INTO public.certificate_records(application_id, certificate_id, status, verified_on, valid_until, issued_by, certificate_hash, signature, verification_url)
    VALUES (certificate_demo_id, 'VMX-CERT-KAR-DEMO0002', 'VALID', current_date, '2030-12-31', 'officer.bengaluru@verimetrix.demo', certificate_hash, certificate_hash, 'https://veri-metrix.vercel.app/verify?certificate=VMX-CERT-KAR-DEMO0002')
    ON CONFLICT (certificate_id) DO NOTHING;
  END IF;
END
$$;
