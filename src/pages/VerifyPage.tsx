import { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  Building2,
  Wrench,
  User,
  Hash,
  Award,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  CERTIFICATE_COLORS,
  formatDate,
  type CertificateRecord,
  type VerificationApplication,
} from '@/lib/types';

interface VerifyPageProps {
  onNavigate: (page: string) => void;
}

export default function VerifyPage({ onNavigate }: VerifyPageProps) {
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('certificate') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [application, setApplication] = useState<VerificationApplication | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      setError('Please enter a certificate ID.');
      return;
    }
    setLoading(true);
    setError(null);
    setCertificate(null);
    setApplication(null);
    try {
      const { data: result, error: certError } = await supabase.rpc('public_verify_certificate', {
        certificate_id_input: query.trim().toUpperCase(),
      });

      if (certError) throw certError;
      const resultObject = result as (CertificateRecord & { application?: VerificationApplication }) | Record<string, never>;
      const cert = Object.keys(resultObject).length > 0 ? resultObject as CertificateRecord & { application?: VerificationApplication } : null;
      if (!cert) {
        setError('No certificate found with that ID. Please check and try again.');
        return;
      }

      setCertificate(cert);
      setApplication(cert.application || null);
    } catch {
      setError('Unable to verify right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (query) void handleSearch();
  }, [handleSearch, query]);

  const isExpired = certificate ? new Date(`${certificate.valid_until}T23:59:59`).getTime() < Date.now() : false;
  const effectiveStatus = certificate ? (certificate.status === 'VALID' && isExpired ? 'EXPIRED' : certificate.status) : null;
  const isValid = effectiveStatus === 'VALID';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-900 mb-4">
            <QrCode className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Verify a Certificate</h1>
          <p className="text-gray-500">Enter a certificate ID to confirm its authenticity. No account required.</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. VMX-CERT-MAH-2026-00428"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Tip: Try VMX-CERT-MAH-2026-00428 or VMX-CERT-TN-2026-00104 to see valid certificates.
          </p>
        </div>

        {/* Result */}
        {certificate && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className={`rounded-2xl border-2 ${CERTIFICATE_COLORS[effectiveStatus || certificate.status].border} ${CERTIFICATE_COLORS[effectiveStatus || certificate.status].bg} p-6 text-center`}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-white shadow-sm">
                {isValid ? <CheckCircle2 className="w-9 h-9 text-emerald-600" /> : <XCircle className="w-9 h-9 text-red-600" />}
              </div>
              <h2 className={`text-2xl font-bold ${CERTIFICATE_COLORS[effectiveStatus || certificate.status].text} mb-2`}>
                Certificate {effectiveStatus}
              </h2>
              <p className="text-gray-600 text-sm">
                {isValid
                  ? 'This certificate is authentic and currently valid.'
                  : effectiveStatus === 'EXPIRED'
                  ? 'This certificate has expired. The instrument requires re-verification.'
                  : 'This certificate has been revoked by the issuing authority.'}
              </p>
            </div>

            {/* Certificate Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-900 to-blue-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8" />
                    <div>
                      <div className="font-bold text-lg">VeriMetrix Verification Certificate</div>
                      <div className="text-xs text-blue-200">Government of India · Legal Metrology</div>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-blue-900" />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-6 text-center">
                  <div className="text-xs text-blue-600 uppercase tracking-wide font-semibold mb-1">Certificate ID</div>
                  <div className="text-xl font-mono font-bold text-blue-900">{certificate.certificate_id}</div>
                </div>

                {application && (
                  <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                    <InfoRow icon={Wrench} label="Instrument" value={application.instrument_type} />
                    <InfoRow icon={Hash} label="Serial Number" value={application.serial_number} />
                    <InfoRow icon={User} label="Owner / Applicant" value={application.applicant_name} />
                    <InfoRow icon={Building2} label="Organisation" value={application.organization} />
                    <InfoRow icon={Wrench} label="Manufacturer" value={application.manufacturer} />
                    <InfoRow icon={Hash} label="Model" value={application.model_number} />
                    <InfoRow icon={Calendar} label="Verified On" value={formatDate(certificate.verified_on)} />
                    <InfoRow icon={Calendar} label="Valid Until" value={formatDate(certificate.valid_until)} />
                    <InfoRow icon={MapPin} label="Location" value={application.installation_location} />
                    <InfoRow icon={Award} label="Issued By" value={certificate.issued_by} />
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Digitally signed · Authentic record</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${CERTIFICATE_COLORS[effectiveStatus || certificate.status].bg} ${CERTIFICATE_COLORS[effectiveStatus || certificate.status].text} border ${CERTIFICATE_COLORS[effectiveStatus || certificate.status].border}`}>
                    {effectiveStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(certificate.verification_url || `${window.location.origin}/verify?certificate=${certificate.certificate_id}`)}`} alt="Certificate verification QR code" className="w-32 h-32 border border-gray-200 rounded-lg" />
              <button onClick={() => window.print()} className="px-5 py-2.5 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800">Download / Print PDF</button>
            </div>

            <div className="text-center">
              <button
                onClick={() => onNavigate('home')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-700" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function MapPin(props: React.ComponentProps<typeof Wrench>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
