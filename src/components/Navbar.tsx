import { ShieldCheck, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

const PUBLIC_LINKS = [
  { label: 'Home', page: 'home' },
  { label: 'Apply', page: 'apply' },
  { label: 'Track Application', page: 'track' },
  { label: 'Verify Certificate', page: 'verify' },
  { label: 'How It Works', page: 'how-it-works' },
];

export default function Navbar({ onNavigate, currentPage }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const handleNav = (page: string) => {
    onNavigate(page);
    setOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button onClick={() => handleNav('home')} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <div className="text-lg font-bold text-gray-900 leading-tight">VeriMetrix</div>
              <div className="text-[10px] text-gray-500 leading-tight tracking-wide uppercase">Legal Metrology Verification</div>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-1">
            {PUBLIC_LINKS.map((link) => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentPage === link.page
                    ? 'text-blue-900 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleNav('officer-login')}
              className="ml-2 px-4 py-2 rounded-md text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 transition-colors shadow-sm"
            >
              Officer Login
            </button>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-3 space-y-1">
            {PUBLIC_LINKS.map((link) => (
              <button
                key={link.page}
                onClick={() => handleNav(link.page)}
                className={`block w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                  currentPage === link.page ? 'text-blue-900 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => handleNav('officer-login')}
              className="block w-full text-left px-3 py-2 rounded-md text-sm font-semibold text-white bg-blue-900 mt-2"
            >
              Officer Login
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
