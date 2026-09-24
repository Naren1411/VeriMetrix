import {
  FileCheck,
  Search,
  Clock,
  Award,
  ShieldCheck,
  QrCode,
  RefreshCw,
  ClipboardList,
  MapPin,
  Building2,
  Upload,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface HowItWorksPageProps {
  onNavigate: (page: string) => void;
}

const STEPS = [
  {
    icon: FileCheck,
    title: 'Step 1 — Online Application',
    desc: 'The applicant registers on VeriMetrix and submits a new verification application through the guided online form.',
    details: [
      'Enter applicant details: name, organisation, contact, address, state, and district.',
      'Select instrument category: weighing, measuring, or industrial instruments.',
      'Provide instrument details: manufacturer, model, serial number, capacity, installation location, and purpose.',
      'Upload required documents: GST certificate, manufacturer certificate, previous verification certificate, invoice, and installation photographs.',
      'Receive a unique application number for tracking.',
    ],
  },
  {
    icon: MapPin,
    title: 'Step 2 — Jurisdiction Routing',
    desc: 'The application is automatically routed to the appropriate Legal Metrology office and assigned to a verification officer.',
    details: [
      'System determines the correct state and district jurisdiction from the installation address.',
      'Application is assigned to the Office of the Controller of Legal Metrology for that district.',
      'A verification officer is designated to handle the application.',
      'The applicant can track the jurisdiction assignment in real time.',
    ],
  },
  {
    icon: Search,
    title: 'Step 3 — Document Verification',
    desc: 'The assigned officer reviews all submitted documents for completeness, validity, and consistency.',
    details: [
      'Officer checks that all required documents have been uploaded.',
      'Serial numbers and model details are cross-checked for consistency.',
      'GST certificate and manufacturer certificates are validated.',
      'If documents are missing or invalid, the application is returned to the applicant with reasons.',
      'If documents are in order, the application moves to inspection scheduling.',
    ],
  },
  {
    icon: Clock,
    title: 'Step 4 — Inspection Scheduling',
    desc: 'The officer schedules a physical inspection at the instrument installation site.',
    details: [
      'Inspection date, time slot, and location are communicated to the applicant.',
      'Category-specific inspection checklists are prepared for the instrument type.',
      'The workflow records the inspection schedule and can deliver notifications when a provider is configured.',
    ],
  },
  {
    icon: ClipboardList,
    title: 'Step 5 — Physical Inspection',
    desc: 'The verification officer conducts a physical inspection using category-specific checklists.',
    details: [
      'Instrument identification and serial number are confirmed on site.',
      'Physical condition of the instrument is assessed.',
      'Accuracy tests are conducted against applicable standards.',
      'Required tests and observed values are recorded.',
      'Compliance findings and inspection remarks are documented.',
      'Inspection outcome: Pass or Fail. Failed inspections include correction guidance.',
    ],
  },
  {
    icon: Award,
    title: 'Step 6 — Certificate Issuance',
    desc: 'Upon a successful inspection, a digitally signed verification certificate is generated.',
    details: [
      'Certificate includes a unique certificate ID, instrument details, verification date, and expiry date.',
      'A QR code is generated for instant public verification.',
      'The certificate can be verified publicly through its certificate ID and QR link.',
      'The certificate status is recorded as VALID in the public registry.',
    ],
  },
  {
    icon: QrCode,
    title: 'Step 7 — Public Verification',
    desc: 'Anyone can verify the authenticity of a certificate at any time — no account required.',
    details: [
      'Scan the QR code on the certificate or enter the certificate ID on the VeriMetrix portal.',
      'The system displays the certificate status: VALID, EXPIRED, or REVOKED.',
      'Instrument details, issuing authority, and validity period are shown.',
      'This ensures transparency and trust for consumers and trading partners.',
    ],
  },
  {
    icon: RefreshCw,
    title: 'Step 8 — Renewal',
    desc: 'Certificates are valid for a fixed period. Renewal ensures continued compliance.',
    details: [
      'The system records expiry and surfaces renewal candidates to officers.',
      'A renewal request is created from the existing verified instrument record.',
      'The renewal follows the same review and inspection workflow.',
      'A new certificate is issued with an updated validity period.',
    ],
  },
];

const DOCUMENT_CHECKLIST = [
  { name: 'GST Certificate', required: true, desc: 'Valid GST registration certificate of the applicant organisation.' },
  { name: 'Manufacturer Certificate', required: true, desc: 'Certificate of conformity from the instrument manufacturer.' },
  { name: 'Previous Verification Certificate', required: false, desc: 'The most recent verification certificate, if this is a renewal.' },
  { name: 'Invoice / Proof of Purchase', required: true, desc: 'Purchase invoice showing the instrument serial number.' },
  { name: 'Installation Photograph', required: true, desc: 'A clear photograph of the installed instrument at its location.' },
  { name: 'NABL Calibration Report', required: false, desc: 'For precision instruments, a valid NABL-accredited calibration report.' },
  { name: 'PESO Licence', required: false, desc: 'For fuel dispensing units, a valid PESO licence.' },
];

export default function HowItWorksPage({ onNavigate }: HowItWorksPageProps) {
  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-blue-200" />
            <h1 className="text-3xl md:text-4xl font-bold mb-4">How VeriMetrix Works</h1>
            <p className="text-lg text-blue-100 max-w-2xl mx-auto">
              A complete walkthrough of the digital verification and certification workflow — from application to public certificate verification and renewal.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {STEPS.map((step, idx) => (
              <div key={step.title} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-48 bg-gradient-to-br from-blue-900 to-blue-700 p-6 flex flex-col items-center justify-center text-white text-center">
                    <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
                      <step.icon className="w-7 h-7" />
                    </div>
                    <div className="text-xs uppercase tracking-wide text-blue-200">Step {idx + 1}</div>
                  </div>
                  <div className="flex-1 p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title.split(' — ')[1] || step.title}</h3>
                    <p className="text-gray-500 mb-4">{step.desc}</p>
                    <ul className="space-y-2">
                      {step.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Document Checklist */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Upload className="w-10 h-10 mx-auto mb-3 text-blue-700" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Required Documents</h2>
            <p className="text-gray-500">Make sure you have these documents ready before starting your application.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {DOCUMENT_CHECKLIST.map((doc) => (
              <div key={doc.name} className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.required ? 'bg-blue-50' : 'bg-gray-50'}`}>
                  <FileCheck className={`w-5 h-5 ${doc.required ? 'text-blue-700' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{doc.name}</span>
                    {doc.required ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-red-100 text-red-700">Required</span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-gray-100 text-gray-500">Optional</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{doc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <Building2 className="w-10 h-10 mx-auto mb-3 text-blue-700" />
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Who Uses VeriMetrix?</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: FileCheck, title: 'Applicants', desc: 'Manufacturers, traders, importers, and service providers who need their instruments verified and certified.' },
              { icon: ShieldCheck, title: 'Verification Officers', desc: 'Legal Metrology officers who review documents, schedule inspections, and issue certificates.' },
              { icon: QrCode, title: 'Public', desc: 'Consumers, trading partners, and regulators who verify the authenticity of any certificate.' },
            ].map((role) => (
              <div key={role.title} className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-100">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 mb-4">
                  <role.icon className="w-6 h-6 text-blue-700" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{role.title}</h3>
                <p className="text-sm text-gray-500">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm mb-4">
            <AlertCircle className="w-4 h-4" />
            Ready to begin?
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Start your verification application now</h2>
          <button
            onClick={() => onNavigate('apply')}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white text-blue-900 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Apply for Verification
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
}
