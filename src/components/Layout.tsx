
import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import OnboardingFlow from "@/components/OnboardingFlow";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

const Layout = () => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // Map current path to active section for Sidebar highlighting
    const getActiveSection = (path: string) => {
        if (path === '/' || path === '/dashboard') return 'dashboard';
        return path.substring(1).split('/')[0]; // e.g., 'leads' from '/leads/new'
    };

    const [activeSection, setActiveSection] = useState(getActiveSection(location.pathname));

    useEffect(() => {
        setActiveSection(getActiveSection(location.pathname));
    }, [location.pathname]);

    const handleSectionChange = (section: string) => {
        if (section === 'dashboard') {
            navigate('/');
        } else {
            navigate(`/${section}`);
        }
    };

    // Keyboard shortcuts for quick navigation
    useKeyboardShortcuts([
        { key: 'd', ctrl: true, callback: () => navigate('/'), description: 'Dashboard' },
        { key: 'l', ctrl: true, callback: () => navigate('/leads'), description: 'Leads' },
        { key: 'a', ctrl: true, callback: () => navigate('/agentes'), description: 'Agentes IA' },
        { key: 'p', ctrl: true, callback: () => navigate('/pipeline'), description: 'Pipeline' },
    ]);

    if (loading) {
        return <LoadingSpinner fullScreen text="Carregando aplicação..." />;
    }

    if (!user) {
        return <LoadingSpinner fullScreen text="Redirecionando para login..." />;
    }

    return (
        <div className="min-h-screen bg-background flex relative overflow-hidden transition-colors duration-500">
            <OnboardingFlow />

            <Sidebar
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
            />

            <main className="flex-1 overflow-auto relative z-10 scrollbar-premium">
                <div className="max-w-[1920px] mx-auto reveal-up">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
