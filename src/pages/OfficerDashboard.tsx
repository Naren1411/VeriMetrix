import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  FileCheck,
  ClipboardList,
  Award,
  BarChart3,
  LogOut,
  Search,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Wrench,
  User,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
  QrCode,
  TrendingUp,
  Building2,
  RefreshCw,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  STATUS_COLORS,
  CERTIFICATE_COLORS,
  formatDate,
  formatDateTime,
  type VerificationApplication,
  type WorkflowEvent,
  type CertificateRecord,
  type ApplicationStatus,
  INSPECTION_CHECKLISTS,
} from '@/lib/types';

interface OfficerDashboardProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

type Tab = 'overview' | 'applications' | 'review' | 'inspection' | 'certificates' | 'reports';

export default function OfficerDashboard({ onNavigate, onLogout }: OfficerDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<VerificationApplication | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [impactMetrics, setImpactMetrics] = useState<{ total_applications: number; certificates_issued: number; cases_needing_correction: number; average_processing_days: number } | null>(null);

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('verification_applications')
        .select('*')
        .order('submitted_at', { ascending: false });
      if (fetchError) throw fetchError;
      setApplications(data || []);

      const { data: certData } = await supabase
        .from('certificate_records')
        .select('*')
        .order('created_at', { ascending: false });
      setCertificates(certData || []);

      const { data: metricsData } = await supabase.from('workflow_impact_metrics').select('*').single();
      setImpactMetrics(metricsData || null);
    } catch {
      setError('Unable to load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    const realtimeChannel = supabase
      .channel('officer-workflow-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'verification_applications' }, loadApplications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'certificate_records' }, loadApplications)
      .subscribe();

    return () => {
      void supabase.removeChannel(realtimeChannel);
    };
  }, [loadApplications]);

  const loadAppDetail = async (app: VerificationApplication) => {
    setSelectedApp(app);
    const { data } = await supabase
      .from('workflow_events')
      .select('*')
      .eq('application_id', app.id)
      .order('created_at', { ascending: true });
    setEvents(data || []);
  };

  const updateAppStatus = async (app: VerificationApplication, status: ApplicationStatus, eventType: string, eventLabel: string, notes: string, eventStatus: string = 'Completed') => {
    setActionLoading(true);
    try {
      const { error: transitionError } = await supabase.rpc('transition_application', {
        application_id_input: app.id,
        next_status: status,
        event_type_input: eventType,
        event_label_input: eventLabel,
        notes_input: notes,
        event_status_input: eventStatus,
      });
      if (transitionError) throw transitionError;
      void supabase.functions.invoke('send-notification', {
        body: { recipient_email: app.email, title: eventLabel, message: notes },
      });

      await loadApplications();
      const updated = { ...app, status };
      setSelectedApp(updated);
      await loadAppDetail(updated);
    } catch {
      setError('Failed to update application status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const scheduleInspection = async (app: VerificationApplication, schedule: { inspector_name: string; scheduled_date: string; scheduled_time: string; location: string }) => {
    setActionLoading(true);
    try {
      const { error: scheduleError } = await supabase.rpc('schedule_inspection', {
        application_id_input: app.id,
        inspector_name_input: schedule.inspector_name,
        scheduled_date_input: schedule.scheduled_date,
        scheduled_time_input: schedule.scheduled_time,
        location_input: schedule.location,
      });
      if (scheduleError) throw scheduleError;
      await loadApplications();
    } catch {
      setError('Failed to save the inspection schedule. Please try again.');
      setActionLoading(false);
    }
  };

  const submitInspection = async (app: VerificationApplication, responses: Record<string, string | boolean>, outcome: 'Passed' | 'Failed', remarks: string) => {
    setActionLoading(true);
    try {
      const { error: checklistError } = await supabase.rpc('submit_inspection', {
        application_id_input: app.id,
        responses_input: responses,
        outcome_input: outcome,
        remarks_input: remarks,
      });
      if (checklistError) throw checklistError;
      await loadApplications();
    } catch {
      setError('Failed to submit the inspection result. Please try again.');
      setActionLoading(false);
    }
  };

  const requestRenewal = async (cert: CertificateRecord) => {
    const source = applications.find((app) => app.id === cert.application_id);
    if (!source) return;
    setActionLoading(true);
    try {
      const { data: renewal, error: renewalError } = await supabase.rpc('request_renewal', { application_id_input: source.id });
      if (renewalError) throw renewalError;
      if (!renewal) throw new Error('Renewal was not created');
      await loadApplications();
    } catch {
      setError('Unable to create the renewal application. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const issueCertificate = async (app: VerificationApplication) => {
    setActionLoading(true);
    try {
      const validUntil = new Date();
      validUntil.setFullYear(validUntil.getFullYear() + 1);
      validUntil.setDate(validUntil.getDate() - 1);
      const { data: userData } = await supabase.auth.getUser();
      const signingPayload = `${app.id}|${app.serial_number}|${validUntil.toISOString().split('T')[0]}|${userData.user?.email || ''}`;
      const { data: signingResult, error: signingError } = await supabase.functions.invoke('sign-certificate', {
        body: { payload: signingPayload },
      });
      if (signingError || !signingResult?.signature) throw signingError || new Error('Certificate signing service did not return a signature');
      const { data: cert, error: certError } = await supabase.rpc('issue_signed_certificate', {
        application_id_input: app.id,
        valid_until_input: validUntil.toISOString().split('T')[0],
        signature_input: signingResult.signature,
      });
      if (certError) throw certError;
      if (!cert) throw new Error('Certificate was not created');
      await loadApplications();
    } catch {
      setError('Failed to issue certificate. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingReview = applications.filter((a) => a.status === 'Submitted' || a.status === 'Under Review');
  const scheduledInspections = applications.filter((a) => a.status === 'Inspection Scheduled');
  const issuedCerts = applications.filter((a) => a.status === 'Certificate Issued');
  const inspectionReady = applications.filter((a) => a.status === 'Under Review');

  const filteredApps = applications.filter((app) => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesDistrict = filterDistrict === 'all' || app.district === filterDistrict;
    const matchesCategory = filterCategory === 'all' || app.instrument_category === filterCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || app.application_number.toLowerCase().includes(q) || app.applicant_name.toLowerCase().includes(q) || app.serial_number.toLowerCase().includes(q);
    return matchesStatus && matchesDistrict && matchesCategory && matchesSearch;
  });

  const stats = {
    total: filteredApps.length,
    pending: filteredApps.filter((a) => a.status === 'Submitted' || a.status === 'Under Review').length,
    inspections: filteredApps.filter((a) => a.status === 'Inspection Scheduled').length,
    issued: filteredApps.filter((a) => a.status === 'Certificate Issued').length,
  };

  if (selectedApp) {
    return (
      <ApplicationDetail
        app={selectedApp}
        events={events}
        onBack={() => { setSelectedApp(null); setEvents([]); }}
        onApprove={(app) => updateAppStatus(app, 'Under Review', 'review', 'Document Verification', 'All documents verified. Application approved for inspection scheduling.', 'Completed')}
        onSchedule={(app) => updateAppStatus(app, 'Inspection Scheduled', 'scheduling', 'Inspection Scheduled', 'Physical inspection scheduled at the instrument installation location.', 'Completed')}
        onPass={(app) => updateAppStatus(app, 'Inspection Completed', 'inspection', 'Physical Inspection', 'Instrument verified against applicable standards. All accuracy tests passed within permissible error. Instrument sealed and stamped.', 'Passed')}
        onFail={(app) => updateAppStatus(app, 'Returned', 'inspection', 'Physical Inspection', 'Instrument failed verification. Correction required before re-inspection. See inspection remarks.', 'Failed')}
        onIssue={issueCertificate}
        actionLoading={actionLoading}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-semibold">VeriMetrix Officer Portal</span>
            </div>
            <button onClick={onLogout} className="inline-flex items-center gap-1.5 text-sm text-blue-200 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 hidden md:block">
          <nav className="space-y-1 sticky top-6">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'applications', label: 'All Applications', icon: FileCheck },
              { id: 'review', label: 'Document Review', icon: ClipboardList, badge: pendingReview.length },
              { id: 'inspection', label: 'Inspections', icon: Clock, badge: scheduledInspections.length },
              { id: 'certificates', label: 'Certificates', icon: Award, badge: issuedCerts.length },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === item.id ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab === item.id ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>{item.badge}</span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Mobile tabs */}
          <div className="md:hidden flex gap-1 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
            {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'applications', label: 'Applications', icon: FileCheck },
              { id: 'review', label: 'Review', icon: ClipboardList },
              { id: 'inspection', label: 'Inspections', icon: Clock },
              { id: 'certificates', label: 'Certificates', icon: Award },
              { id: 'reports', label: 'Reports', icon: BarChart3 },
            ].map((item) => (
              <button key={item.id} onClick={() => setTab(item.id as Tab)} className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium ${tab === item.id ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'overview' && <OverviewTab stats={stats} applications={applications} onView={loadAppDetail} impactMetrics={impactMetrics} />}
              {tab === 'applications' && (
                <ApplicationsTab
                  applications={filteredApps}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  filterDistrict={filterDistrict}
                  setFilterDistrict={setFilterDistrict}
                  filterCategory={filterCategory}
                  setFilterCategory={setFilterCategory}
                  districts={[...new Set(applications.map((app) => app.district))].sort()}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onView={loadAppDetail}
                />
              )}
              {tab === 'review' && <ReviewTab applications={pendingReview} onView={loadAppDetail} onApprove={(app) => updateAppStatus(app, 'Under Review', 'review', 'Document Verification', 'All documents verified. Application approved for inspection scheduling.', 'Completed')} onReturn={(app) => updateAppStatus(app, 'Returned', 'review', 'Returned for Correction', 'Document review found missing or inconsistent information. Please correct and resubmit.', 'Failed')} actionLoading={actionLoading} />}
              {tab === 'inspection' && <InspectionTab applications={[...inspectionReady, ...scheduledInspections]} onView={loadAppDetail} onSchedule={scheduleInspection} onSubmit={submitInspection} actionLoading={actionLoading} />}
              {tab === 'certificates' && <CertificatesTab certificates={certificates} applications={applications} onView={loadAppDetail} onIssue={issueCertificate} onRenew={requestRenewal} eligibleApps={applications.filter((a) => a.status === 'Inspection Completed')} actionLoading={actionLoading} onNavigate={onNavigate} />}
              {tab === 'reports' && <ReportsTab applications={applications} certificates={certificates} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- Overview ---------- */

function OverviewTab({ stats, applications, onView, impactMetrics }: { stats: { total: number; pending: number; inspections: number; issued: number }; applications: VerificationApplication[]; onView: (app: VerificationApplication) => void; impactMetrics: { total_applications: number; certificates_issued: number; cases_needing_correction: number; average_processing_days: number } | null }) {
  const recent = applications.slice(0, 5);
  const cards = [
    { label: 'Total Applications', value: stats.total, icon: FileCheck, color: 'blue' },
    { label: 'Pending Review', value: stats.pending, icon: ClipboardList, color: 'amber' },
    { label: 'Inspections Scheduled', value: stats.inspections, icon: Clock, color: 'cyan' },
    { label: 'Certificates Issued', value: stats.issued, icon: Award, color: 'emerald' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here is the current status of verification applications.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 bg-${card.color}-50`}>
              <card.icon className={`w-5 h-5 text-${card.color}-600`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-sm text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-emerald-950">Public-service impact</h2>
            <p className="text-xs text-emerald-800 mt-1">Live database metrics for the current workflow.</p>
          </div>
          <TrendingUp className="w-5 h-5 text-emerald-700" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Applications', impactMetrics?.total_applications ?? stats.total],
            ['Certificates', impactMetrics?.certificates_issued ?? stats.issued],
            ['Corrections', impactMetrics?.cases_needing_correction ?? 0],
            ['Avg. days', impactMetrics?.average_processing_days ?? 0],
          ].map(([label, value]) => <div key={label} className="rounded-lg bg-white/80 p-3"><div className="text-xl font-bold text-emerald-950">{value}</div><div className="text-xs text-emerald-800">{label}</div></div>)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Applications</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recent.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No applications yet.</div>
          ) : (
            recent.map((app) => (
              <button key={app.id} onClick={() => onView(app)} className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">{app.application_number}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{app.applicant_name} · {app.instrument_type}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Applications List ---------- */

function ApplicationsTab({ applications, filterStatus, setFilterStatus, filterDistrict, setFilterDistrict, filterCategory, setFilterCategory, districts, searchQuery, setSearchQuery, onView }: {
  applications: VerificationApplication[];
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterDistrict: string;
  setFilterDistrict: (s: string) => void;
  filterCategory: string;
  setFilterCategory: (s: string) => void;
  districts: string[];
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  onView: (app: VerificationApplication) => void;
}) {
  const statuses = ['all', 'Submitted', 'Under Review', 'Inspection Scheduled', 'Inspection Completed', 'Certificate Issued', 'Returned'];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">All Applications</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by application no., applicant, or serial no."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700">
            {statuses.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}
          </select>
          <select value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700">
            <option value="all">All Districts</option>
            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700">
            <option value="all">All Instruments</option>
            <option value="Weighing Instruments">Weighing Instruments</option>
            <option value="Measuring Instruments">Measuring Instruments</option>
            <option value="Industrial Instruments">Industrial Instruments</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-2 pr-4 font-medium">Application No.</th>
                <th className="py-2 pr-4 font-medium">Applicant</th>
                <th className="py-2 pr-4 font-medium hidden md:table-cell">Instrument</th>
                <th className="py-2 pr-4 font-medium hidden lg:table-cell">District</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No applications found.</td></tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} onClick={() => onView(app)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs font-medium text-gray-900">{app.application_number}</td>
                    <td className="py-3 pr-4 text-gray-700">{app.applicant_name}</td>
                    <td className="py-3 pr-4 text-gray-500 hidden md:table-cell text-xs">{app.instrument_type}</td>
                    <td className="py-3 pr-4 text-gray-500 hidden lg:table-cell text-xs">{app.district}</td>
                    <td className="py-3 pr-4"><StatusBadge status={app.status} /></td>
                    <td className="py-3"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Document Review ---------- */

function ReviewTab({ applications, onView, onApprove, onReturn, actionLoading }: {
  applications: VerificationApplication[];
  onView: (app: VerificationApplication) => void;
  onApprove: (app: VerificationApplication) => void;
  onReturn: (app: VerificationApplication) => void;
  actionLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Review</h1>
        <p className="text-gray-500 text-sm mt-1">Applications awaiting document verification.</p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <p className="text-gray-500">All caught up — no applications pending review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">{app.application_number}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{app.applicant_name} · {app.organization}</div>
                </div>
                <div className="text-xs text-gray-400">Submitted {formatDate(app.submitted_at)}</div>
              </div>

              <div className="grid md:grid-cols-3 gap-3 mb-4 text-sm">
                <div><span className="text-gray-400">Instrument:</span> <span className="text-gray-700">{app.instrument_type}</span></div>
                <div><span className="text-gray-400">Serial:</span> <span className="text-gray-700 font-mono">{app.serial_number}</span></div>
                <div><span className="text-gray-400">District:</span> <span className="text-gray-700">{app.district}</span></div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Submitted Documents</div>
                <div className="flex flex-wrap gap-2">
                  {app.document_names.map((doc) => (
                    <span key={doc} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle2 className="w-3 h-3" />
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-50">
                <button onClick={() => onView(app)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  View Details
                </button>
                <button
                  onClick={() => onApprove(app)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
                >
                  Approve Documents
                </button>
                <button
                  onClick={() => onReturn(app)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 transition-colors"
                >
                  Return for Correction
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Inspection ---------- */

function InspectionTab({ applications, onView, onSchedule, onSubmit, actionLoading }: {
  applications: VerificationApplication[];
  onView: (app: VerificationApplication) => void;
  onSchedule: (app: VerificationApplication, schedule: { inspector_name: string; scheduled_date: string; scheduled_time: string; location: string }) => void;
  onSubmit: (app: VerificationApplication, responses: Record<string, string | boolean>, outcome: 'Passed' | 'Failed', remarks: string) => void;
  actionLoading: boolean;
}) {
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [inspector, setInspector] = useState('Assigned Legal Metrology Inspector');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [checklistFor, setChecklistFor] = useState<VerificationApplication | null>(null);
  const [responses, setResponses] = useState<Record<string, string | boolean>>({});
  const [remarks, setRemarks] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
        <p className="text-gray-500 text-sm mt-1">Applications ready for inspection scheduling and physical inspection.</p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No applications in the inspection stage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-gray-900">{app.application_number}</span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">{app.applicant_name} · {app.instrument_type}</div>
                  <div className="text-xs text-gray-400 mt-1">Location: {app.installation_location}</div>
                </div>
              </div>

              {app.status === 'Inspection Scheduled' && (
                <div className="bg-cyan-50 rounded-lg p-3 mb-3">
                  <div className="text-xs font-semibold text-cyan-800 uppercase tracking-wide mb-1">Category checklist</div>
                  <p className="text-sm text-cyan-900">{INSPECTION_CHECKLISTS[app.instrument_category]?.length || 0} checks for {app.instrument_category}.</p>
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-50">
                <button onClick={() => onView(app)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  View Details
                </button>
                {app.status === 'Under Review' && (
                  <button
                    onClick={() => { setScheduleFor(app.id); setLocation(app.installation_location); setDate(''); }}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-lg bg-cyan-600 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-60 transition-colors"
                  >
                    Schedule Inspection
                  </button>
                )}
                {app.status === 'Inspection Scheduled' && (
                  <>
                    <button
                      onClick={() => { setChecklistFor(app); setResponses({}); setRemarks(''); }}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
                    >
                      Open Checklist
                    </button>
                  </>
                )}
              </div>
              {scheduleFor === app.id && (
                <div className="mt-4 grid md:grid-cols-2 gap-3 border-t border-gray-100 pt-4">
                  <label className="text-sm text-gray-600">Inspector<input value={inspector} onChange={(e) => setInspector(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" /></label>
                  <label className="text-sm text-gray-600">Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" /></label>
                  <label className="text-sm text-gray-600">Time<input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" /></label>
                  <label className="text-sm text-gray-600">Location<input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" /></label>
                  <button onClick={() => { if (date && location) { onSchedule(app, { inspector_name: inspector, scheduled_date: date, scheduled_time: time, location }); setScheduleFor(null); } }} disabled={actionLoading || !date || !location} className="md:col-span-2 justify-self-start rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save Inspection Schedule</button>
                </div>
              )}
              {checklistFor?.id === app.id && (
                <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                  <div className="text-sm font-semibold text-gray-900">{app.instrument_category} inspection checklist</div>
                  {(INSPECTION_CHECKLISTS[app.instrument_category] || []).map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={responses[item] === true} onChange={(e) => setResponses((current) => ({ ...current, [item]: e.target.checked }))} />{item}</label>
                  ))}
                  <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Inspection remarks, observed readings, or correction guidance" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900" rows={2} />
                  <div className="flex gap-2"><button onClick={() => { onSubmit(app, responses, 'Passed', remarks); setChecklistFor(null); }} disabled={actionLoading} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Check className="mr-1 inline w-4 h-4" />Pass Inspection</button><button onClick={() => { onSubmit(app, responses, 'Failed', remarks); setChecklistFor(null); }} disabled={actionLoading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Fail and Return</button></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Certificates ---------- */

function CertificatesTab({ certificates, applications, onView, onIssue, onRenew, eligibleApps, actionLoading, onNavigate }: {
  certificates: CertificateRecord[];
  applications: VerificationApplication[];
  onView: (app: VerificationApplication) => void;
  onIssue: (app: VerificationApplication) => void;
  onRenew: (cert: CertificateRecord) => void;
  eligibleApps: VerificationApplication[];
  actionLoading: boolean;
  onNavigate: (page: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
        <p className="text-gray-500 text-sm mt-1">Issue new certificates and view all issued certificates.</p>
      </div>

      {eligibleApps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-amber-700" />
            <h2 className="font-semibold text-amber-900">Ready for Certificate Issuance</h2>
          </div>
          <div className="space-y-2">
            {eligibleApps.map((app) => (
              <div key={app.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                <div>
                  <div className="font-mono text-sm font-medium text-gray-900">{app.application_number}</div>
                  <div className="text-xs text-gray-500">{app.applicant_name} · {app.instrument_type}</div>
                </div>
                <button
                  onClick={() => onIssue(app)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
                >
                  Issue Certificate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All Issued Certificates</h2>
        </div>
        {certificates.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No certificates issued yet.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {certificates.map((cert) => {
              const app = applications.find((a) => a.id === cert.application_id);
              const daysUntilExpiry = Math.ceil((new Date(`${cert.valid_until}T23:59:59`).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const reminder = daysUntilExpiry <= 60 && daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : daysUntilExpiry <= 0 ? 'Expired' : null;
              return (
                <div key={cert.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium text-gray-900">{cert.certificate_id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${CERTIFICATE_COLORS[cert.status].bg} ${CERTIFICATE_COLORS[cert.status].text}`}>{cert.status}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-0.5">
                      {app ? `${app.applicant_name} · ${app.instrument_type}` : '—'}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      Verified {formatDate(cert.verified_on)} · Valid until {formatDate(cert.valid_until)}
                    </div>
                    {reminder && <div className="text-xs font-medium text-orange-700 mt-1">Renewal reminder: {reminder}</div>}
                  </div>
                  {app && (
                    <div className="flex gap-2"><button onClick={() => onView(app)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors flex-shrink-0">View Application</button>{daysUntilExpiry <= 60 && <button onClick={() => onRenew(cert)} disabled={actionLoading} className="px-3 py-1.5 rounded-lg bg-orange-600 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50">Renew</button>}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
        <QrCode className="w-5 h-5 text-blue-700 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Issued certificates can be publicly verified without an account.
          <button onClick={() => onNavigate('verify')} className="font-semibold underline ml-1">Go to public verification</button>
        </p>
      </div>
    </div>
  );
}

/* ---------- Reports ---------- */

function ReportsTab({ applications, certificates }: { applications: VerificationApplication[]; certificates: CertificateRecord[] }) {
  const byCategory = applications.reduce((acc, app) => {
    acc[app.instrument_category] = (acc[app.instrument_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byDistrict = applications.reduce((acc, app) => {
    acc[app.district] = (acc[app.district] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byStatus = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const maxCategory = Math.max(...Object.values(byCategory), 1);
  const maxDistrict = Math.max(...Object.values(byDistrict), 1);

  const expiringSoon = certificates.filter((c) => {
    const days = Math.floor((new Date(c.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 60 && days > 0;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Summary of verification activity across jurisdictions and categories.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: applications.length, icon: FileCheck },
          { label: 'Certificates Issued', value: certificates.length, icon: Award },
          { label: 'Valid Certificates', value: certificates.filter((c) => c.status === 'VALID').length, icon: ShieldCheck },
          { label: 'Expiring (60 days)', value: expiringSoon.length, icon: RefreshCw },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 bg-blue-50">
              <s.icon className="w-5 h-5 text-blue-700" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ReportCard title="Applications by Category" icon={TrendingUp}>
          {Object.entries(byCategory).map(([cat, count]) => (
            <BarRow key={cat} label={cat} value={count} max={maxCategory} color="bg-blue-600" />
          ))}
        </ReportCard>

        <ReportCard title="Applications by District" icon={Building2}>
          {Object.entries(byDistrict).map(([dist, count]) => (
            <BarRow key={dist} label={dist} value={count} max={maxDistrict} color="bg-emerald-600" />
          ))}
        </ReportCard>
      </div>

      <ReportCard title="Applications by Status" icon={ClipboardList}>
        <div className="flex flex-wrap gap-3">
          {Object.entries(byStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100">
              <StatusBadge status={status as ApplicationStatus} />
              <span className="font-bold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </ReportCard>
    </div>
  );
}

function ReportCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-blue-700" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------- Application Detail ---------- */

function ApplicationDetail({ app, events, onBack, onApprove, onSchedule, onPass, onFail, onIssue, actionLoading, onNavigate }: {
  app: VerificationApplication;
  events: WorkflowEvent[];
  onBack: () => void;
  onApprove: (app: VerificationApplication) => void;
  onSchedule: (app: VerificationApplication) => void;
  onPass: (app: VerificationApplication) => void;
  onFail: (app: VerificationApplication) => void;
  onIssue: (app: VerificationApplication) => void;
  actionLoading: boolean;
  onNavigate: (page: string) => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-mono text-lg font-bold text-gray-900">{app.application_number}</div>
              <div className="text-sm text-gray-500 mt-1">{app.applicant_name} · {app.organization}</div>
            </div>
            <StatusBadge status={app.status} />
          </div>
        </div>

        {/* Details */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <DetailCard title="Applicant" icon={User}>
            <DetailRow label="Name" value={app.applicant_name} />
            <DetailRow label="Organisation" value={app.organization} />
            <DetailRow label="Email" value={app.email} />
            <DetailRow label="Phone" value={app.phone} />
            <DetailRow label="Type" value={app.applicant_type} />
            <DetailRow label="Address" value={app.address} />
          </DetailCard>

          <DetailCard title="Instrument" icon={Wrench}>
            <DetailRow label="Category" value={app.instrument_category} />
            <DetailRow label="Type" value={app.instrument_type} />
            <DetailRow label="Manufacturer" value={app.manufacturer} />
            <DetailRow label="Model" value={app.model_number} />
            <DetailRow label="Serial No." value={app.serial_number} />
            <DetailRow label="Capacity" value={app.capacity_range} />
            <DetailRow label="Location" value={app.installation_location} />
            <DetailRow label="Purpose" value={app.purpose} />
          </DetailCard>

          <DetailCard title="Jurisdiction" icon={MapPin}>
            <DetailRow label="State" value={app.state} />
            <DetailRow label="District" value={app.district} />
            <DetailRow label="Office" value={app.office} />
            <DetailRow label="Officer" value={app.officer_name} />
          </DetailCard>

          <DetailCard title="Documents" icon={FileText}>
            <div className="flex flex-wrap gap-2 mt-1">
              {app.document_names.map((doc) => (
                <span key={doc} className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {doc}
                </span>
              ))}
            </div>
          </DetailCard>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-700" />
            Application History
          </h3>
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  event.event_status === 'Completed' || event.event_status === 'Passed' ? 'bg-emerald-100' :
                  event.event_status === 'Failed' ? 'bg-red-100' :
                  event.event_status === 'In Progress' ? 'bg-amber-100' : 'bg-gray-100'
                }`}>
                  {event.event_status === 'Completed' || event.event_status === 'Passed' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                   event.event_status === 'Failed' ? <XCircle className="w-5 h-5 text-red-600" /> : <Clock className="w-5 h-5 text-amber-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-medium text-gray-900 text-sm">{event.event_label}</h4>
                    <span className="text-xs text-gray-400">{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{event.notes}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <span className="text-gray-400">{event.actor_name}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      event.event_status === 'Completed' || event.event_status === 'Passed' ? 'bg-emerald-50 text-emerald-700' :
                      event.event_status === 'Failed' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>{event.event_status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Officer Actions</h3>
          <div className="flex flex-wrap gap-2">
            {app.status === 'Submitted' && (
              <button onClick={() => onApprove(app)} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors">
                Approve Documents
              </button>
            )}
            {app.status === 'Under Review' && (
              <button onClick={() => onSchedule(app)} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-cyan-600 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-60 transition-colors">
                Schedule Inspection
              </button>
            )}
            {app.status === 'Inspection Scheduled' && (
              <>
                <button onClick={() => onPass(app)} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors">
                  Mark Inspection Passed
                </button>
                <button onClick={() => onFail(app)} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-60 transition-colors">
                  Mark Inspection Failed
                </button>
              </>
            )}
            {app.status === 'Inspection Completed' && (
              <button onClick={() => onIssue(app)} disabled={actionLoading} className="px-4 py-2 rounded-lg bg-blue-900 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60 transition-colors">
                Issue Certificate
              </button>
            )}
            {app.status === 'Certificate Issued' && (
              <button onClick={() => onNavigate('verify')} className="px-4 py-2 rounded-lg border border-blue-200 text-sm font-medium text-blue-900 hover:bg-blue-50 transition-colors">
                View Public Certificate
              </button>
            )}
            {actionLoading && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared ---------- */

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {status}
    </span>
  );
}

function DetailCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
