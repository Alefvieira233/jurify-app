
import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Menu, X, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlobalSearch from "@/components/GlobalSearch";
import ThemeToggle from "@/components/ThemeToggle";
import AIAssistantChat from "@/components/ai/AIAssistantChat";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useLocalPrazosNotifications } from '@/hooks/useLocalPrazosNotifications';
import { WifiOff, Wifi } from "lucide-react";
import { useCapacitor } from '@/hooks/useCapacitor';
import { App as CapacitorApp } from '@capacitor/app';

const Layout = () => {
    const { user, loading, profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Realtime sync — all core tables auto-invalidate React Query cache
    useRealtimeSync();
    usePushNotifications();
    useLocalPrazosNotifications();
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
        if (path === '/' || path === '/dashboard') return 'dashboard';
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
        navigate(section === 'dashboard' ? '/' : `/${section}`);
        setMobileMenuOpen(false);
    };

    useKeyboardShortcuts([
        { key: 'd', ctrl: true, callback: () => navigate('/'),          description: 'Dashboard' },
        { key: 'l', ctrl: true, callback: () => navigate('/crm'),       description: 'Clientes' },
        { key: 'a', ctrl: true, callback: () => navigate('/agentes'),   description: 'Agentes IA' },
        { key: 'p', ctrl: true, callback: () => navigate('/pipeline'),  description: 'Pipeline' },
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

    if (loading) return <LoadingSpinner fullScreen text="Carregando aplicação..." />;
    if (!user)   return <LoadingSpinner fullScreen text="Redirecionando para login..." />;

    const userInitial = (profile?.nome_completo ?? user.email ?? 'U').charAt(0).toUpperCase();

    return (
        <div className="min-h-screen bg-background flex flex-col">
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

            {/* ── Mobile Header (< lg) ── */}
            <header className={`lg:hidden fixed top-0 inset-x-0 z-50 bg-primary border-b border-primary/80 flex items-center gap-3 px-4 shadow-sm ${isNative ? 'mobile-header-offset pt-2' : 'h-14'}`}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="h-9 w-9 text-white hover:bg-white/15 flex-shrink-0"
                    aria-label="Abrir menu"
                >
                    {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>

                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
                        <Scale className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-base font-bold text-white tracking-tight">Jurify</span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <ThemeToggle />
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{userInitial}</span>
                    </div>
                </div>
            </header>

            {/* ── Mobile Menu Overlay ── */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ── Body: Sidebar + Main ── */}
            <div className="flex flex-1 lg:h-screen">
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
                <main className={`flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0 ${isNative ? 'mobile-bottom-safe' : ''}`}>
                    <div className="reveal-up">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
