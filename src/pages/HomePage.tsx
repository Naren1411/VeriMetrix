import {
  ShieldCheck,
  FileCheck,
  Search,
  Award,
  ArrowRight,
  Users,
  Building2,
  QrCode,
  Clock,
  UserPlus,
  BrainCircuit,
  BellRing,
  Fingerprint,
  Network,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const WORKFLOW_STEPS = [
  { icon: FileCheck, title: 'Apply Online', desc: 'Submit instrument details and documents through a simple guided form.' },
  { icon: Search, title: 'Document Review', desc: 'Officers verify your documents and route the application to the right jurisdiction.' },
  { icon: Clock, title: 'Inspection', desc: 'A scheduled physical inspection at your premises with category-specific checklists.' },
  { icon: Award, title: 'Certificate', desc: 'Receive a digitally signed certificate with a QR code for public verification.' },
];

const STATS = [
  { icon: Users, value: '1', label: 'Citizen-facing portal' },
  { icon: FileCheck, value: '7', label: 'Workflow stages modeled' },
  { icon: Award, value: '24/7', label: 'Public certificate lookup' },
  { icon: Building2, value: 'Multi-state', label: 'Jurisdiction-ready design' },
];

export default function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium mb-6">
                <ShieldCheck className="w-4 h-4" />
                SIH prototype · Legal Metrology workflow
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Trusted Measurements.<br />
                <span className="text-blue-200">Safer Markets.</span>
              </h1>
              <p className="text-lg text-blue-100 leading-relaxed mb-8 max-w-xl">
                VeriMetrix is a pilot-ready digital workflow for verification and certification of weighing and measuring instruments. Apply online, track your application, and verify certificates from one accountable record.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => onNavigate('apply')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white text-blue-900 font-semibold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
                >
                  Apply for Verification
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate('verify')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600/30 backdrop-blur-sm border border-white/30 text-white font-semibold hover:bg-blue-600/50 transition-all"
                >
                  <QrCode className="w-5 h-5" />
                  Verify a Certificate
                </button>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-white/10 rounded-2xl backdrop-blur-sm"></div>
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 text-gray-900">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-blue-900" />
                      <span className="font-bold text-gray-900">Verification Certificate</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">VALID</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Certificate ID</div>
                      <div className="text-sm font-mono font-semibold text-gray-900">VMX-CERT-MAH-2026-00428</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Instrument</div>
                        <div className="text-sm font-medium text-gray-900">Non-automatic weighing instrument</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Serial No.</div>
                        <div className="text-sm font-mono font-medium text-gray-900">AYI6702-2401-0789</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Verified On</div>
                        <div className="text-sm font-medium text-gray-900">15 Aug 2026</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Valid Until</div>
                        <div className="text-sm font-medium text-gray-900">14 Aug 2027</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Issuing Authority</div>
                        <div className="text-sm font-medium text-gray-900">Controller of Legal Metrology, Pune</div>
                      </div>
                      <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                        <QrCode className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300 mb-3">The government pain point</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Replace paper trails with one accountable chain of evidence.</h2>
            <p className="text-slate-300 leading-relaxed">VeriMetrix connects the applicant, district office, inspector, certificate, and public verifier in one traceable workflow. Every decision is time-stamped, every certificate is checkable, and every renewal is visible before an instrument quietly falls out of compliance.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {['Fewer lost files', 'Faster district routing', 'Tamper-evident certificates', 'Inspection accountability'].map((item) => <div key={item} className="border border-slate-700 rounded-lg p-4 text-slate-200">{item}</div>)}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 mb-3">
                  <stat.icon className="w-6 h-6 text-blue-700" />
                </div>
                <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How Verification Works</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A simple four-step process from application to a digitally verifiable certificate.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={step.title} className="relative bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="absolute top-4 right-4 text-5xl font-bold text-blue-50">{idx + 1}</div>
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 mb-4 shadow-md">
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button
              onClick={() => onNavigate('how-it-works')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-blue-900 text-blue-900 font-semibold hover:bg-blue-900 hover:text-white transition-colors"
            >
              Learn More About the Process
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 text-xs font-bold uppercase tracking-wide mb-4">
              <ShieldCheck className="w-4 h-4" />
              Built for a stronger compliance ecosystem
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">One platform. Six powerful capabilities.</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Every stage of legal metrology verification is connected, traceable, and ready for action.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: UserPlus, number: '01', title: 'Digital Instrument Registration', desc: 'Register weighing and measuring instruments online and create a unique digital passport for every asset.', accent: 'blue' },
              { icon: FileCheck, number: '02', title: 'End-to-End Verification', desc: 'Online application, document submission, scheduling, officer allocation, inspection, and real-time tracking in one workflow.', accent: 'emerald' },
              { icon: BrainCircuit, number: '03', title: 'Smart Rules & Risk Engine', desc: 'Configurable verification rules and risk flags surface anomalies before they become compliance issues.', accent: 'slate' },
              { icon: Fingerprint, number: '04', title: 'Tamper-Evident Digital Certificate', desc: 'Generate QR-enabled certificates linked to the public registry so every issued record can be checked independently.', accent: 'orange' },
              { icon: BellRing, number: '05', title: 'Real-time Notifications', desc: 'Keep applicants and officers informed with status updates, inspection alerts, renewal reminders, and exception notices.', accent: 'red' },
              { icon: Network, number: '06', title: 'One Platform, Multiple Stakeholders', desc: 'Bring businesses, officers, administrators, and the public together on a secure, shared source of truth.', accent: 'cyan' },
            ].map((feature) => (
              <div key={feature.title} className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl transition-all duration-300">
                <div className="absolute right-5 top-4 text-5xl font-black text-gray-100 group-hover:text-blue-50 transition-colors">{feature.number}</div>
                <div className="relative">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5 transition-all duration-300 group-hover:scale-110 ${
                    feature.accent === 'blue' ? 'bg-blue-50 text-blue-700 group-hover:bg-blue-900 group-hover:text-white' :
                    feature.accent === 'emerald' ? 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white' :
                    feature.accent === 'slate' ? 'bg-slate-100 text-slate-700 group-hover:bg-slate-800 group-hover:text-white' :
                    feature.accent === 'orange' ? 'bg-orange-50 text-orange-700 group-hover:bg-orange-600 group-hover:text-white' :
                    feature.accent === 'red' ? 'bg-red-50 text-red-700 group-hover:bg-red-600 group-hover:text-white' :
                    'bg-cyan-50 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white'
                  }`}>
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-900 to-blue-700 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to verify your instruments?</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Start your verification application today and join thousands of businesses ensuring fair trade through accurate measurements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('apply')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white text-blue-900 font-semibold shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
            >
              Start Application
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('track')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-blue-600/30 backdrop-blur-sm border border-white/30 text-white font-semibold hover:bg-blue-600/50 transition-all"
            >
              Track Existing Application
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
