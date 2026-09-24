import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Loader2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OfficerLoginPageProps {
  onNavigate: (page: string) => void;
  onLogin: () => void;
}

export default function OfficerLoginPage({ onNavigate, onLogin }: OfficerLoginPageProps) {
  const [email, setEmail] = useState('anjali.deshpande@legalmetrology.gov.in');
  const [password, setPassword] = useState('verimetrix');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.');
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (data.session) {
        const role = data.user?.app_metadata?.role || data.user?.user_metadata?.role;
        if (role !== 'officer' && role !== 'admin') throw new Error('This account is not authorized for the officer portal.');
        onLogin();
      }
    } catch (err) {
      setError(
        err instanceof Error && (err.message.includes('Invalid login') || err.message.includes('Invalid login credentials'))
          ? 'Invalid officer credentials. Create this email in Supabase Authentication or reset its password, then try again.'
          : err instanceof Error && err.message.includes('not authorized')
          ? 'This account is valid, but it is not assigned the officer or admin role in Supabase Auth.'
          : err instanceof Error && err.message.includes('Supabase is not configured')
          ? err.message
          : 'Unable to sign in right now. Please check your Supabase configuration and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const role = data.session?.user?.app_metadata?.role || data.session?.user?.user_metadata?.role;
      if (data.session && (role === 'officer' || role === 'admin')) onLogin();
    });
  }, [onLogin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Officer Portal Login</h1>
          <p className="text-blue-200 text-sm">Authorized Legal Metrology personnel only</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@legalmetrology.gov.in"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            {demoMode && <button
              type="button"
              onClick={onLogin}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-blue-200 text-blue-900 font-semibold hover:bg-blue-50 transition-colors"
            >
              Open Demo Dashboard
              <ArrowRight className="w-5 h-5" />
            </button>}
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-700" />
                <span className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Demo Access</span>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed">
                Sign in with an authorized Supabase Auth account. Administrator role assignment is required for officer access.
              </p>
              <button
                onClick={() => onNavigate('home')}
                className="mt-3 text-xs font-medium text-blue-900 hover:text-blue-700 inline-flex items-center gap-1"
              >
                Back to public site
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
