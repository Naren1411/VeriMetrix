import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import HowItWorksPage from '@/pages/HowItWorksPage';
import ApplyPage from '@/pages/ApplyPage';
import TrackPage from '@/pages/TrackPage';
import VerifyPage from '@/pages/VerifyPage';
import OfficerLoginPage from '@/pages/OfficerLoginPage';
import OfficerDashboard from '@/pages/OfficerDashboard';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type Page = 'home' | 'apply' | 'track' | 'verify' | 'how-it-works' | 'officer-login' | 'officer-dashboard';

const PAGE_PATHS: Record<Page, string> = {
  home: '/',
  apply: '/apply',
  track: '/track',
  verify: '/verify',
  'how-it-works': '/how-it-works',
  'officer-login': '/officer/login',
  'officer-dashboard': '/officer/dashboard',
};

function pageFromPath(pathname: string): Page {
  const page = (Object.keys(PAGE_PATHS) as Page[]).find((key) => PAGE_PATHS[key] === pathname);
  return page ?? 'home';
}

export default function App() {
  const [page, setPage] = useState<Page>(() => pageFromPath(window.location.pathname));
  const [officerLoggedIn, setOfficerLoggedIn] = useState(false);

  const isOfficerSession = (session: Session | null) => {
    const role = session?.user?.app_metadata?.role || session?.user?.user_metadata?.role;
    return role === 'officer' || role === 'admin';
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isOfficerSession(data.session)) setOfficerLoggedIn(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setOfficerLoggedIn(!!session && isOfficerSession(session));
    });

    const handlePopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', handlePopState);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleNavigate = (target: string) => {
    const requestedPage = target as Page;
    const nextPage = requestedPage === 'officer-dashboard' && !officerLoggedIn
      ? 'officer-login'
      : requestedPage;

    if (!PAGE_PATHS[nextPage]) return;

    if (window.location.pathname !== PAGE_PATHS[nextPage]) {
      window.history.pushState({}, '', PAGE_PATHS[nextPage]);
    }

    if (nextPage === 'officer-login') {
      setPage('officer-login');
      return;
    }

    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfficerLogin = () => {
    setOfficerLoggedIn(true);
    window.history.pushState({}, '', PAGE_PATHS['officer-dashboard']);
    setPage('officer-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOfficerLogout = async () => {
    await supabase.auth.signOut();
    setOfficerLoggedIn(false);
    handleNavigate('home');
  };

  if (page === 'officer-login') {
    return <OfficerLoginPage onNavigate={handleNavigate} onLogin={handleOfficerLogin} />;
  }

  if (page === 'officer-dashboard' && officerLoggedIn) {
    return <OfficerDashboard onNavigate={handleNavigate} onLogout={handleOfficerLogout} />;
  }

  if (page === 'officer-dashboard' && !officerLoggedIn) {
    window.history.replaceState({}, '', PAGE_PATHS['officer-login']);
    return <OfficerLoginPage onNavigate={handleNavigate} onLogin={handleOfficerLogin} />;
  }

  const isPublicPage = page === 'home' || page === 'apply' || page === 'track' || page === 'verify' || page === 'how-it-works';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {isPublicPage && <Navbar onNavigate={handleNavigate} currentPage={page} />}
      <div className="flex-1">
        {page === 'home' && <HomePage onNavigate={handleNavigate} />}
        {page === 'how-it-works' && <HowItWorksPage onNavigate={handleNavigate} />}
        {page === 'apply' && <ApplyPage onNavigate={handleNavigate} />}
        {page === 'track' && <TrackPage onNavigate={handleNavigate} />}
        {page === 'verify' && <VerifyPage onNavigate={handleNavigate} />}
      </div>
      {isPublicPage && <Footer onNavigate={handleNavigate} />}
    </div>
  );
}
