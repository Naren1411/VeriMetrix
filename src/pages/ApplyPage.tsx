import { useState } from 'react';
import {
  FileCheck,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  Wrench,
  Send,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  INSTRUMENT_CATEGORIES,
  APPLICANT_TYPES,
  STATES,
  STATE_DISTRICTS,
  generateApplicationNumber,
  JURISDICTION_OFFICERS,
  type VerificationApplication,
} from '@/lib/types';

interface ApplyPageProps {
  onNavigate: (page: string) => void;
}

const STEPS = ['Applicant Details', 'Instrument Details', 'Document Upload', 'Review & Submit'];
const DOCUMENT_OPTIONS = [
  'GST Certificate.pdf',
  'Manufacturer Certificate.pdf',
  'Previous Verification Certificate.pdf',
  'Invoice / Bill.pdf',
  'Installation Photograph.jpg',
  'NABL Calibration Report.pdf',
  'PESO Licence.pdf',
];

export default function ApplyPage({ onNavigate }: ApplyPageProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<VerificationApplication | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [form, setForm] = useState({
    applicant_name: '',
    email: '',
    phone: '',
    organization: '',
    applicant_type: 'Manufacturer',
    address: '',
    state: 'Maharashtra',
    district: 'Pune',
    instrument_category: 'Weighing Instruments',
    instrument_type: '',
    manufacturer: '',
    model_number: '',
    serial_number: '',
    capacity_range: '',
    installation_location: '',
    purpose: '',
    document_names: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const toggleDocument = (documentName: string) => {
    setForm((previous) => ({
      ...previous,
      document_names: previous.document_names.includes(documentName)
        ? previous.document_names.filter((name) => name !== documentName)
        : [...previous.document_names, documentName],
    }));
  };

  const validateStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (stepIndex === 0) {
      if (!form.applicant_name.trim()) newErrors.applicant_name = 'Name is required';
      if (!form.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Enter a valid email';
      if (!form.phone.trim()) newErrors.phone = 'Phone is required';
      else if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ''))) newErrors.phone = 'Enter a valid 10-digit phone number';
      if (!form.organization.trim()) newErrors.organization = 'Organisation is required';
      if (!form.address.trim()) newErrors.address = 'Address is required';
    }
    if (stepIndex === 1) {
      if (!form.instrument_type.trim()) newErrors.instrument_type = 'Instrument type is required';
      if (!form.manufacturer.trim()) newErrors.manufacturer = 'Manufacturer is required';
      if (!form.model_number.trim()) newErrors.model_number = 'Model number is required';
      if (!form.serial_number.trim()) newErrors.serial_number = 'Serial number is required';
      if (!form.capacity_range.trim()) newErrors.capacity_range = 'Capacity / range is required';
      if (!form.installation_location.trim()) newErrors.installation_location = 'Installation location is required';
      if (!form.purpose.trim()) newErrors.purpose = 'Purpose of use is required';
    }
    if (stepIndex === 2) {
      if (selectedFiles.some((file) => !['application/pdf', 'image/jpeg', 'image/png'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
        newErrors.document_names = 'Files must be PDF, JPG, or PNG and no larger than 10 MB';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const uploadedPaths: string[] = [];
    try {
      const applicationNumber = generateApplicationNumber(form.state, form.district);
      const jurisdiction = JURISDICTION_OFFICERS[`${form.state}:${form.district}`];
      const office = jurisdiction?.office || `Office of the Controller of Legal Metrology, ${form.district}`;
      const officerName = jurisdiction?.officer || `Verification Officer, ${form.district}`;

      const { data, error: submitError } = await supabase.rpc('submit_application', {
        payload: {
          application_number: applicationNumber,
          applicant_name: form.applicant_name,
          email: form.email,
          phone: form.phone,
          organization: form.organization,
          applicant_type: form.applicant_type,
          address: form.address,
          state: form.state,
          district: form.district,
          office,
          officer_name: officerName,
          instrument_category: form.instrument_category,
          instrument_type: form.instrument_type,
          manufacturer: form.manufacturer,
          model_number: form.model_number,
          serial_number: form.serial_number,
          capacity_range: form.capacity_range,
          installation_location: form.installation_location,
          purpose: form.purpose,
          document_names: form.document_names,
        },
      });

      if (submitError) throw submitError;
      if (!data?.id) throw new Error('Application was created without an ID. Please run the latest database migrations.');

      for (const file of selectedFiles) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `applications/${data.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('application-documents').upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });
        if (uploadError) throw new Error(`Document upload failed for ${file.name}: ${uploadError.message}`);
        uploadedPaths.push(storagePath);
        const { error: recordError } = await supabase.rpc('record_application_document', {
          application_id_input: data.id,
          application_email_input: form.email,
          document_name_input: file.name,
          storage_path_input: storagePath,
          mime_type_input: file.type,
          byte_size_input: file.size,
        });
        if (recordError) throw new Error(`Document registration failed for ${file.name}: ${recordError.message}`);
      }

      setSubmittedApp(data);
    } catch (err) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from('application-documents').remove(uploadedPaths);
      }
      setError(err instanceof Error ? err.message : 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyAppNumber = () => {
    if (submittedApp) {
      navigator.clipboard.writeText(submittedApp.application_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (submittedApp) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                <CheckCircle2 className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Application Submitted Successfully!</h2>
              <p className="text-emerald-50">Your verification application has been received and routed.</p>
            </div>
            <div className="p-8">
              <div className="bg-blue-50 rounded-xl p-6 mb-6 text-center">
                <div className="text-xs text-blue-600 uppercase tracking-wide font-semibold mb-2">Your Application Number</div>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl font-mono font-bold text-blue-900">{submittedApp.application_number}</span>
                  <button onClick={copyAppNumber} className="p-2 rounded-lg hover:bg-blue-100 transition-colors">
                    {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-blue-700" />}
                  </button>
                </div>
                <p className="text-sm text-blue-600 mt-3">Save this number and use the same email ({submittedApp.email}) on Track Application to view your status.</p>
              </div>

              <div className="space-y-3 mb-6">
                <h3 className="font-semibold text-gray-900">What happens next?</h3>
                {[
                  'Your application has been routed to the Office of the Controller of Legal Metrology.',
                  'A verification officer will review your documents within 3-5 working days.',
                  'If documents are in order, an inspection will be scheduled at your premises.',
                  'You will receive updates at each stage — track using your application number.',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => onNavigate('track')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors"
                >
                  Track This Application
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate('home')}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">New Verification Application</h1>
          <p className="text-gray-500">Complete the form below to apply for instrument verification and certification.</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((label, idx) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    idx < step ? 'bg-emerald-500 text-white' : idx === step ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {idx < step ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <div className={`text-[10px] md:text-xs mt-2 text-center max-w-[80px] ${idx <= step ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 rounded ${idx < step ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          {/* Step 0: Applicant Details */}
          {step === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-blue-700" />
                <h2 className="text-lg font-semibold text-gray-900">Applicant Details</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Full Name" required error={errors.applicant_name}>
                  <input type="text" value={form.applicant_name} onChange={(e) => update('applicant_name', e.target.value)} className={inputClass(errors.applicant_name)} placeholder="e.g. Rajesh Sharma" />
                </Field>
                <Field label="Organisation" required error={errors.organization}>
                  <input type="text" value={form.organization} onChange={(e) => update('organization', e.target.value)} className={inputClass(errors.organization)} placeholder="e.g. Rajesh Metal Industries Pvt Ltd" />
                </Field>
                <Field label="Email" required error={errors.email}>
                  <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass(errors.email)} placeholder="e.g. quality@company.in" />
                </Field>
                <Field label="Phone (10 digits)" required error={errors.phone}>
                  <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass(errors.phone)} placeholder="e.g. 9876543210" />
                </Field>
                <Field label="Applicant Type" required>
                  <select value={form.applicant_type} onChange={(e) => update('applicant_type', e.target.value)} className={inputClass()}>
                    {APPLICANT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="State" required>
                  <select value={form.state} onChange={(e) => { update('state', e.target.value); update('district', STATE_DISTRICTS[e.target.value][0]); }} className={inputClass()}>
                    {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="District" required>
                  <select value={form.district} onChange={(e) => update('district', e.target.value)} className={inputClass()}>
                    {(STATE_DISTRICTS[form.state] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="Address" required error={errors.address}>
                    <textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={2} className={inputClass(errors.address)} placeholder="Full installation or business address" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Instrument Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Wrench className="w-5 h-5 text-blue-700" />
                <h2 className="text-lg font-semibold text-gray-900">Instrument Details</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Instrument Category" required>
                  <select value={form.instrument_category} onChange={(e) => update('instrument_category', e.target.value)} className={inputClass()}>
                    {INSTRUMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Instrument Type" required error={errors.instrument_type}>
                  <input type="text" value={form.instrument_type} onChange={(e) => update('instrument_type', e.target.value)} className={inputClass(errors.instrument_type)} placeholder="e.g. Non-automatic weighing instrument" />
                </Field>
                <Field label="Manufacturer" required error={errors.manufacturer}>
                  <input type="text" value={form.manufacturer} onChange={(e) => update('manufacturer', e.target.value)} className={inputClass(errors.manufacturer)} placeholder="e.g. Avery India" />
                </Field>
                <Field label="Model Number" required error={errors.model_number}>
                  <input type="text" value={form.model_number} onChange={(e) => update('model_number', e.target.value)} className={inputClass(errors.model_number)} placeholder="e.g. Avery 6702-D" />
                </Field>
                <Field label="Serial Number" required error={errors.serial_number}>
                  <input type="text" value={form.serial_number} onChange={(e) => update('serial_number', e.target.value)} className={inputClass(errors.serial_number)} placeholder="e.g. AYI6702-2401-0789" />
                </Field>
                <Field label="Capacity / Range" required error={errors.capacity_range}>
                  <input type="text" value={form.capacity_range} onChange={(e) => update('capacity_range', e.target.value)} className={inputClass(errors.capacity_range)} placeholder="e.g. 60 kg x 10 g" />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Installation Location" required error={errors.installation_location}>
                    <input type="text" value={form.installation_location} onChange={(e) => update('installation_location', e.target.value)} className={inputClass(errors.installation_location)} placeholder="e.g. Weighbridge Bay 3, Plot 14, MIDC Pimpri, Pune" />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Purpose of Use" required error={errors.purpose}>
                    <textarea value={form.purpose} onChange={(e) => update('purpose', e.target.value)} rows={2} className={inputClass(errors.purpose)} placeholder="e.g. Trade - dispatch weighing of finished steel components" />
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Document Upload */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Upload className="w-5 h-5 text-blue-700" />
                <h2 className="text-lg font-semibold text-gray-900">Document Upload</h2>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  Select the documents you are submitting. Real file upload is optional for testing; GST Certificate and Invoice / Bill are recommended.
                </p>
              </div>
              {errors.document_names && <p className="text-sm text-red-600">{errors.document_names}</p>}
              <div className="grid md:grid-cols-2 gap-3">
                {DOCUMENT_OPTIONS.map((documentName) => (
                  <label key={documentName} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${form.document_names.includes(documentName) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={form.document_names.includes(documentName)} onChange={() => toggleDocument(documentName)} className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" />
                    <FileCheck className={`w-5 h-5 ${form.document_names.includes(documentName) ? 'text-blue-700' : 'text-gray-400'}`} />
                    <span className="text-sm font-medium text-gray-900">{documentName}</span>
                  </label>
                ))}
              </div>
              <label className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/50 p-6 cursor-pointer hover:border-blue-400 transition-colors">
                <Upload className="w-7 h-7 text-blue-700" />
                <span className="text-sm font-semibold text-blue-900">Choose real files to upload</span>
                <span className="text-xs text-blue-700">Optional testing upload: PDF, JPG, or PNG · maximum 10 MB each</span>
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                  className="sr-only"
                />
              </label>
              {selectedFiles.length > 0 && (
                <div className="text-sm text-gray-600 space-y-1 mt-3">
                  {selectedFiles.map((file) => <div key={`${file.name}-${file.size}`} className="flex justify-between"><span>{file.name}</span><span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>)}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {selectedFiles.length === 0 ? 'No files selected. You can continue for testing.' : `${selectedFiles.length} real file(s) selected.`} {form.document_names.length} document type(s) recorded.
              </p>
            </div>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-5 h-5 text-blue-700" />
                <h2 className="text-lg font-semibold text-gray-900">Review & Submit</h2>
              </div>
              <div className="space-y-4">
                <ReviewSection title="Applicant" icon={User}>
                  <ReviewItem label="Name" value={form.applicant_name} />
                  <ReviewItem label="Organisation" value={form.organization} />
                  <ReviewItem label="Email" value={form.email} />
                  <ReviewItem label="Phone" value={form.phone} />
                  <ReviewItem label="Type" value={form.applicant_type} />
                  <ReviewItem label="Location" value={`${form.district}, ${form.state}`} />
                  <ReviewItem label="Address" value={form.address} />
                </ReviewSection>
                <ReviewSection title="Instrument" icon={Wrench}>
                  <ReviewItem label="Category" value={form.instrument_category} />
                  <ReviewItem label="Type" value={form.instrument_type} />
                  <ReviewItem label="Manufacturer" value={form.manufacturer} />
                  <ReviewItem label="Model" value={form.model_number} />
                  <ReviewItem label="Serial No." value={form.serial_number} />
                  <ReviewItem label="Capacity / Range" value={form.capacity_range} />
                  <ReviewItem label="Installation" value={form.installation_location} />
                  <ReviewItem label="Purpose" value={form.purpose} />
                </ReviewSection>
                <ReviewSection title="Documents" icon={FileCheck}>
                  <div className="flex flex-wrap gap-2">
                    {form.document_names.map((doc) => (
                      <span key={doc} className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">{doc}</span>
                    ))}
                  </div>
                </ReviewSection>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-900 text-white font-medium hover:bg-blue-800 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function inputClass(error?: string): string {
  return `w-full px-4 py-2.5 rounded-lg border ${error ? 'border-red-300 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm transition-colors`;
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function ReviewSection({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-blue-700" />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
