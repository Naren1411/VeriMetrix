export type ApplicationStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Inspection Scheduled'
  | 'Inspection Completed'
  | 'Inspection Failed'
  | 'Certificate Issued'
  | 'Expired'
  | 'Renewal Requested'
  | 'Returned'
  | 'Rejected';

export type EventStatus = 'Completed' | 'In Progress' | 'Passed' | 'Failed' | 'Pending';

export type CertificateStatus = 'VALID' | 'EXPIRED' | 'REVOKED';

export interface VerificationApplication {
  id: string;
  application_number: string;
  applicant_name: string;
  email: string;
  phone: string;
  organization: string;
  applicant_type: string;
  address: string;
  state: string;
  district: string;
  office: string;
  officer_name: string;
  instrument_category: string;
  instrument_type: string;
  manufacturer: string;
  model_number: string;
  serial_number: string;
  capacity_range: string;
  installation_location: string;
  purpose: string;
  document_names: string[];
  status: ApplicationStatus;
  submitted_at: string;
  updated_at: string;
  correction_reason?: string | null;
  ai_document_status?: 'pending' | 'passed' | 'needs_attention';
}

export interface CertificateRecord {
  id: string;
  application_id: string;
  certificate_id: string;
  status: CertificateStatus;
  verified_on: string;
  valid_until: string;
  issued_by: string;
  created_at: string;
  verification_url?: string;
  certificate_hash?: string;
  signature_valid?: boolean;
  signature_present?: boolean;
  revoked_at?: string | null;
  revocation_reason?: string | null;
}

export interface InspectionSchedule {
  id: string;
  application_id: string;
  inspector_name: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  created_at: string;
}

export interface InspectionChecklist {
  id: string;
  application_id: string;
  category: string;
  responses: Record<string, string | boolean>;
  outcome: 'Pending' | 'Passed' | 'Failed';
  remarks: string | null;
  submitted_by: string;
  submitted_at: string;
}

export interface AuditLog {
  id: string;
  application_id: string;
  action: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus | null;
  actor_name: string;
  actor_role: string;
  details: string | null;
  created_at: string;
}

export interface WorkflowEvent {
  id: string;
  application_id: string;
  event_type: string;
  event_label: string;
  actor_name: string;
  event_status: string;
  notes: string | null;
  created_at: string;
}

export interface ApplicationWithCertificate extends VerificationApplication {
  certificate_records?: CertificateRecord[];
  workflow_events?: WorkflowEvent[];
}

export const STATUS_ORDER: ApplicationStatus[] = [
  'Submitted',
  'Under Review',
  'Inspection Scheduled',
  'Inspection Completed',
  'Certificate Issued',
];

export const STATUS_COLORS: Record<ApplicationStatus, { bg: string; text: string; dot: string }> = {
  'Submitted': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Under Review': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Inspection Scheduled': { bg: 'bg-cyan-50', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  'Inspection Completed': { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  'Inspection Failed': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Certificate Issued': { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  'Expired': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
  'Renewal Requested': { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  'Returned': { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Rejected': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

export const CERTIFICATE_COLORS: Record<CertificateStatus, { bg: string; text: string; border: string }> = {
  'VALID': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'EXPIRED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  'REVOKED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

export const INSTRUMENT_CATEGORIES = [
  'Weighing Instruments',
  'Measuring Instruments',
  'Industrial Instruments',
];

export const APPLICANT_TYPES = [
  'Manufacturer',
  'Trader',
  'Service Provider',
  'Importer',
  'Government Department',
  'Other',
];

export const STATES = [
  'Maharashtra',
  'Gujarat',
  'Karnataka',
  'Rajasthan',
  'Tamil Nadu',
  'Delhi',
  'West Bengal',
  'Uttar Pradesh',
];

export const STATE_DISTRICTS: Record<string, string[]> = {
  'Maharashtra': ['Pune', 'Mumbai', 'Nagpur', 'Nashik', 'Aurangabad'],
  'Gujarat': ['Anand', 'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Karnataka': ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Mangaluru', 'Hubli'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Tamil Nadu': ['Kanchipuram', 'Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
  'West Bengal': ['Kolkata', 'Howrah', 'Darjeeling', 'Siliguri', 'Asansol'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Noida'],
};

export const INSPECTION_CHECKLISTS: Record<string, string[]> = {
  'Weighing Instruments': ['Zero indication returns correctly', 'Accuracy test within permissible error', 'Load cell and platform condition acceptable', 'Sealing and stamping completed'],
  'Measuring Instruments': ['Scale markings are legible', 'Reference length/volume test passed', 'Wear and calibration condition acceptable', 'Sealing and stamping completed'],
  'Industrial Instruments': ['Safety interlocks and enclosure checked', 'Calibration report is current', 'Operating range test passed', 'Sealing and stamping completed'],
};

export const JURISDICTION_OFFICERS: Record<string, { office: string; officer: string }> = Object.fromEntries(
  Object.entries(STATE_DISTRICTS).flatMap(([state, districts]) => districts.map((district) => [
    `${state}:${district}`,
    {
      office: `Office of the Controller of Legal Metrology, ${district}`,
      officer: `Verification Officer, ${district}`,
    },
  ])),
);

export function verificationUrl(certificateId: string): string {
  return `${window.location.origin}/verify?certificate=${encodeURIComponent(certificateId)}`;
}

export function generateApplicationNumber(state: string, district: string): string {
  const stateCode = state.slice(0, 2).toUpperCase();
  const districtCode = district.slice(0, 2).toUpperCase();
  const year = new Date().getFullYear();
  const randomBytes = new Uint32Array(2);
  crypto.getRandomValues(randomBytes);
  const random = Array.from(randomBytes, (value) => value.toString(36).toUpperCase()).join('').slice(0, 10);
  return `VMX-${stateCode}${districtCode}-${year}-${random}`;
}

export function generateCertificateId(state: string, applicationNumber: string): string {
  const stateCode = state.slice(0, 3).toUpperCase();
  const suffix = applicationNumber.split('-').pop();
  return `VMX-CERT-${stateCode}-${suffix}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
