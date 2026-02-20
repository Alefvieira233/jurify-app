
import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlobalSearch from "@/components/GlobalSearch";

const Layout = () => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Map current path to active section for Sidebar highlighting
    const getActiveSection = (path: string) => {
        if (path === '/' || path === '/dashboard') return 'dashboard';
        // Handle nested CRM routes
        if (path.startsWith('/crm/followups')) return 'crm/followups';
        if (path.startsWith('/crm')) return 'crm';
        // Handle admin routes
        if (path.startsWith('/admin/')) return path.substring(1);
        return path.substring(1).split('/')[0] ?? 'dashboard';
    };

    const [activeSection, setActiveSection] = useState(getActiveSection(location.pathname));

    useEffect(() => {
        setActiveSection(getActiveSection(location.pathname));
        // Close mobile menu on navigation
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const handleSectionChange = (section: string) => {
        if (section === 'dashboard') {
            navigate('/');
        } else {
            navigate(`/${section}`);
        }
        setMobileMenuOpen(false);
    };

    // Keyboard shortcuts for quick navigation
    useKeyboardShortcuts([
        { key: 'd', ctrl: true, callback: () => navigate('/'), description: 'Dashboard' },
        { key: 'l', ctrl: true, callback: () => navigate('/leads'), description: 'Leads' },
        { key: 'a', ctrl: true, callback: () => navigate('/agentes'), description: 'Agentes IA' },
        { key: 'p', ctrl: true, callback: () => navigate('/pipeline'), description: 'Pipeline' },
    ]);

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileMenuOpen(false);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    if (loading) {
        return <LoadingSpinner fullScreen text="Carregando aplicação..." />;
    }

    if (!user) {
        return <LoadingSpinner fullScreen text="Redirecionando para login..." />;
    }

    return (
        <div className="min-h-screen bg-background flex relative transition-colors duration-500">
            <OnboardingFlow />
            <GlobalSearch />

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="h-10 w-10"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-6 w-6" />
                        ) : (
                            <Menu className="h-6 w-6" />
                        )}
                    </Button>
                    <span className="text-xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                        Jurify
                    </span>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Desktop: always visible, Mobile: slide-in */}
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

            {/* Main Content */}
            <main className="flex-1 relative z-10 pt-16 lg:pt-0">
                <div className="max-w-[1920px] mx-auto reveal-up p-4 lg:p-0">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
