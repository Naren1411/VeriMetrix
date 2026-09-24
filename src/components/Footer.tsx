import { ShieldCheck, Mail, Phone, MapPin, Globe } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">VeriMetrix</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">Legal Metrology</div>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              A pilot-ready digital workflow for verification and certification of weighing and measuring instruments under the Legal Metrology framework.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Quick Actions</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate('apply')} className="hover:text-white transition-colors">Apply for Verification</button></li>
              <li><button onClick={() => onNavigate('track')} className="hover:text-white transition-colors">Track Application</button></li>
              <li><button onClick={() => onNavigate('verify')} className="hover:text-white transition-colors">Verify a Certificate</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">How It Works</button></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">Verification Process</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">Document Checklist</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">Inspection Guidelines</button></li>
              <li><button onClick={() => onNavigate('how-it-works')} className="hover:text-white transition-colors">Renewal Information</button></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                <span>Legal Metrology workflow prototype</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0 text-blue-400" />
                <span>Contact details configured at pilot launch</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0 text-blue-400" />
                <span>Secure notification channel planned</span>
              </li>
              <li className="flex items-center gap-2">
                <Globe className="w-4 h-4 flex-shrink-0 text-blue-400" />
                <span>For demonstration and evaluation</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} VeriMetrix. A Legal Metrology digital verification initiative.
          </p>
          <p className="text-xs text-gray-400">
            Trusted Measurements · Safer Markets · Fair Trade
          </p>
        </div>
      </div>
    </footer>
  );
}
