
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

const Layout = () => {
    const { user, loading, profile } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        { key: 'l', ctrl: true, callback: () => navigate('/leads'),     description: 'Leads' },
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
            <OnboardingFlow />
            <GlobalSearch />

            {/* ── Mobile Header (< lg) ── */}
            <header className="lg:hidden fixed top-0 inset-x-0 z-50 h-14 bg-primary border-b border-primary/80 flex items-center gap-3 px-4 shadow-sm">
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
                <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
                    <div className="reveal-up">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
