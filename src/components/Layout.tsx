
import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import GlobalSearch from "@/components/GlobalSearch";
import AIAssistantChat from "@/components/ai/AIAssistantChat";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLocalPrazosNotifications } from '@/hooks/useLocalPrazosNotifications';
import { useFocusOnRouteChange } from '@/hooks/useFocusOnRouteChange';
import { WifiOff, Wifi } from "lucide-react";
import { useCapacitor } from '@/hooks/useCapacitor';
import { App as CapacitorApp } from '@capacitor/app';
import TopBar from '@/components/TopBar';
import Breadcrumbs from '@/components/Breadcrumbs';

const Layout = () => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Once layout has rendered with a user, never unmount for loading states.
    // This prevents form data loss during token refresh / tab switch.
    const hasRendered = useRef(false);
    if (user && !loading) hasRendered.current = true;

    // Realtime sync — all core tables auto-invalidate React Query cache
    useRealtimeSync();
    usePushNotifications();
    useLocalPrazosNotifications();
    useFocusOnRouteChange();
    const { isOnline, wasOffline } = useNetworkStatus();
    const { isNative, isAndroid } = useCapacitor();

    // Android hardware back button: close menu → navigate back → exit app
    useEffect(() => {
      if (!isAndroid) return;

      const listenerPromise = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        } else if (canGoBack) {
          window.history.back();
        } else {
          void CapacitorApp.exitApp();
        }
      });

      return () => { void listenerPromise.then(l => l.remove()); };
    }, [isAndroid, mobileMenuOpen]);

    const getActiveSection = (path: string) => {
        if (path === '/') return 'home';
        if (path === '/dashboard') return 'dashboard';
        if (path.startsWith('/crm/followups')) return 'crm/followups';
        if (path.startsWith('/crm')) return 'crm';
        if (path.startsWith('/admin/')) return path.substring(1);
        return path.substring(1).split('/')[0] ?? 'dashboard';
    };

    const [activeSection, setActiveSection] = useState(getActiveSection(location.pathname));

    useEffect(() => {
        setActiveSection(getActiveSection(location.pathname));
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleSectionChange = (section: string) => {
        navigate(section === 'home' ? '/' : `/${section}`);
        setMobileMenuOpen(false);
    };

    useKeyboardShortcuts([
        { key: 'd', ctrl: true, callback: () => navigate('/dashboard'), description: 'Dashboard' },
        { key: 'l', ctrl: true, callback: () => navigate('/crm'),       description: 'Contatos' },
        { key: 'a', ctrl: true, callback: () => navigate('/agentes'),   description: 'Agentes IA' },
        { key: 'p', ctrl: true, callback: () => navigate('/pipeline'),  description: 'Kanban' },
    ]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileMenuOpen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    // Only show loading spinner on first render (before layout ever appeared).
    // After that, keep Layout mounted to preserve form state in child routes.
    if (loading && !hasRendered.current) return <LoadingSpinner fullScreen text="Carregando aplicação..." />;
    if (!user && !hasRendered.current)   return <LoadingSpinner fullScreen text="Redirecionando para login..." />;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Skip-to-content link (WCAG 2.4.1) */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:border focus:rounded-md focus:shadow-lg"
            >
              Pular para conteúdo
            </a>

            {/* Network status banner */}
            {!isOnline && (
                <div className="fixed top-0 inset-x-0 z-[100] bg-destructive text-destructive-foreground text-center text-sm py-2 px-4 flex items-center justify-center gap-2 shadow-lg">
                    <WifiOff className="h-4 w-4" />
                    Sem conexão com a internet. Suas alterações não serão salvas.
                </div>
            )}
            {isOnline && wasOffline && (
                <div className="fixed top-0 inset-x-0 z-[100] bg-green-600 text-white text-center text-sm py-2 px-4 flex items-center justify-center gap-2 shadow-lg animate-in fade-in duration-300">
                    <Wifi className="h-4 w-4" />
                    Conexão restabelecida!
                </div>
            )}
            <OnboardingFlow />
            <GlobalSearch />
            <AIAssistantChat />

            {/* ── TopBar — all screen sizes ── */}
            <TopBar onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />

            {/* ── Mobile Menu Overlay ── */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ── Body: Sidebar + Main ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar — slide-in on mobile, always visible on desktop */}
                <div className={`
                    fixed lg:relative inset-y-0 left-0 z-50
                    transform transition-transform duration-300 ease-in-out
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <Sidebar
                        activeSection={activeSection}
                        onSectionChange={handleSectionChange}
                    />
                </div>

                {/* Main content area */}
                <main
                  id="main-content"
                  tabIndex={-1}
                  className={`flex-1 min-w-0 overflow-y-auto bg-background outline-none ${isNative ? 'mobile-bottom-safe' : ''}`}
                >
                    <Breadcrumbs />
                    <div className="mx-auto max-w-[1920px] w-full min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
