import { useEffect, useState } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  FileText,
  Wrench,
  User,
  MapPin,
  Calendar,
  Hash,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  STATUS_COLORS,
  STATUS_ORDER,
  formatDate,
  formatDateTime,
  type VerificationApplication,
  type WorkflowEvent,
} from '@/lib/types';

interface TrackPageProps {
  onNavigate: (page: string) => void;
}

export default function TrackPage({ onNavigate }: TrackPageProps) {
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<VerificationApplication | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const applicationId = application?.id;

  useEffect(() => {
    if (!applicationId || !query.trim()) return;

    const refreshApplication = async () => {
      const { data: result } = await supabase.rpc('public_track_application', {
        application_number_input: query.trim().toUpperCase(),
        email_input: email.trim().toLowerCase(),
      });
      const data = result && Object.keys(result).length > 0 ? result as VerificationApplication & { workflow_events?: WorkflowEvent[] } : null;
      if (data) {
        setApplication(data);
        setEvents(data.workflow_events || []);
      }
    };

    const refreshTimer = window.setInterval(refreshApplication, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [applicationId, email, query]);

  const handleSearch = async () => {
    if (!query.trim() || !email.trim()) {
      setError('Please enter your application number and email address.');
      return;
    }
    setLoading(true);
    setError(null);
    setApplication(null);
    setEvents([]);
    try {
      const { data: result, error: fetchError } = await supabase.rpc('public_track_application', {
        application_number_input: query.trim().toUpperCase(),
        email_input: email.trim().toLowerCase(),
      });

      if (fetchError) throw fetchError;
      const data = result && Object.keys(result).length > 0 ? result as VerificationApplication & { workflow_events?: WorkflowEvent[] } : null;
      if (!data) {
        setError('No application found with that number. Please check and try again.');
        return;
      }

      setApplication(data);
      setEvents(data.workflow_events || []);
    } catch {
      setError('Unable to search right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = application ? STATUS_ORDER.indexOf(application.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Track Your Application</h1>
          <p className="text-gray-500">Enter your application number and email to see the current status and full history.</p>
          <p className="text-xs text-blue-700 mt-2">Use the exact email address you entered on the application form.</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="e.g. VMX-MAH-2026-00428"
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Email used in the application"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                {loading ? 'Searching...' : 'Track'}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">
            Tip: Try VMX-MAH-2026-00428 or VMX-GJ-2026-00312 or VMX-KA-2026-00267 to see sample applications.
          </p>
        </div>

        {/* Results */}
        {application && (
          <div className="space-y-6">
            {/* Status Banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className={`px-6 py-5 ${STATUS_COLORS[application.status].bg} border-b ${STATUS_COLORS[application.status].bg}`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Application Number</div>
                    <div className="text-xl font-mono font-bold text-gray-900">{application.application_number}</div>
                  </div>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${STATUS_COLORS[application.status].bg} ${STATUS_COLORS[application.status].text} border border-current`}>
                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[application.status].dot}`} />
                    {application.status}
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="p-6">
                <div className="flex items-center justify-between overflow-x-auto">
                  {STATUS_ORDER.map((status, idx) => {
                    const isComplete = idx < currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    const isReturned = application.status === 'Returned' || application.status === 'Rejected';
                    const showAsIssue = isReturned && idx === currentStepIndex;
                    return (
                      <div key={status} className="flex items-center flex-1 last:flex-none min-w-[100px]">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                            showAsIssue ? 'bg-orange-500 text-white' :
                            isComplete ? 'bg-emerald-500 text-white' :
                            isCurrent ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            {showAsIssue ? <XCircle className="w-5 h-5" /> :
                             isComplete ? <CheckCircle2 className="w-5 h-5" /> :
                             isCurrent ? <Clock className="w-5 h-5" /> :
                             <Circle className="w-5 h-5" />}
                          </div>
                          <div className={`text-[10px] mt-2 text-center font-medium ${idx <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'}`}>{status}</div>
                        </div>
                        {idx < STATUS_ORDER.length - 1 && (
                          <div className={`flex-1 h-1 mx-1 rounded ${idx < currentStepIndex ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <DetailCard title="Applicant" icon={User}>
                <DetailRow label="Name" value={application.applicant_name} />
                <DetailRow label="Organisation" value={application.organization} />
                <DetailRow label="Email" value={application.email} />
                <DetailRow label="Phone" value={application.phone} />
                <DetailRow label="Type" value={application.applicant_type} />
              </DetailCard>

              <DetailCard title="Instrument" icon={Wrench}>
                <DetailRow label="Category" value={application.instrument_category} />
                <DetailRow label="Type" value={application.instrument_type} />
                <DetailRow label="Manufacturer" value={application.manufacturer} />
                <DetailRow label="Model" value={application.model_number} />
                <DetailRow label="Serial No." value={application.serial_number} />
                <DetailRow label="Capacity" value={application.capacity_range} />
              </DetailCard>

              <DetailCard title="Jurisdiction" icon={MapPin}>
                <DetailRow label="State" value={application.state} />
                <DetailRow label="District" value={application.district} />
                <DetailRow label="Office" value={application.office} />
                <DetailRow label="Officer" value={application.officer_name} />
              </DetailCard>

              <DetailCard title="Documents" icon={FileText}>
                <div className="flex flex-wrap gap-2 mt-1">
                  {application.document_names.map((doc) => (
                    <span key={doc} className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{doc}</span>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <DetailRow label="Submitted" value={formatDate(application.submitted_at)} />
                  <DetailRow label="Last Updated" value={formatDate(application.updated_at)} />
                </div>
              </DetailCard>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-700" />
                Application History
              </h3>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-100"></div>
                <div className="space-y-5">
                  {events.map((event, idx) => (
                    <div key={event.id} className="relative flex gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                        event.event_status === 'Completed' || event.event_status === 'Passed' ? 'bg-emerald-100' :
                        event.event_status === 'Failed' ? 'bg-red-100' :
                        event.event_status === 'In Progress' ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        {event.event_status === 'Completed' || event.event_status === 'Passed' ?
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                          event.event_status === 'Failed' ? <XCircle className="w-5 h-5 text-red-600" /> :
                          <Clock className="w-5 h-5 text-amber-600" />
                        }
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-medium text-gray-900">{event.event_label}</h4>
                          <span className="text-xs text-gray-400">{formatDateTime(event.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            <Hash className="w-3 h-3" />
                            {event.actor_name}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-medium ${
                            event.event_status === 'Completed' || event.event_status === 'Passed' ? 'bg-emerald-50 text-emerald-700' :
                            event.event_status === 'Failed' ? 'bg-red-50 text-red-700' :
                            event.event_status === 'In Progress' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'
                          }`}>
                            {event.event_status}
                          </span>
                        </div>
                      </div>
                      {idx < events.length - 1 && <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-100"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={() => onNavigate('apply')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-blue-900 text-blue-900 font-semibold hover:bg-blue-900 hover:text-white transition-colors"
              >
                Submit Another Application
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-blue-700" />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
