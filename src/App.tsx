import { Suspense, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initSentry } from "./lib/sentry";
import * as Sentry from '@sentry/react';

// Inicializar Sentry ANTES de tudo
initSentry();

// Componentes críticos - import direto (necessários no carregamento inicial)
import Auth from "./pages/Auth";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
const CookieBanner = lazyWithRetry(() => import("./components/CookieBanner"));

// Páginas públicas (legais e marketing)
const TermosDeUso = lazyWithRetry(() => import("./pages/TermosDeUso"));
const PoliticaDePrivacidade = lazyWithRetry(() => import("./pages/PoliticaDePrivacidade"));
const Pricing = lazyWithRetry(() => import("./pages/Pricing"));

// Lazy loading para features (carregamento sob demanda) — with auto-retry on chunk failure
const Dashboard = lazyWithRetry(() => import("./features/dashboard/Dashboard"));
const PipelineJuridico = lazyWithRetry(() => import("./features/pipeline/PipelineJuridico"));
const AgendamentosManager = lazyWithRetry(() => import("./features/scheduling/AgendamentosManager"));
const ContratosManager = lazyWithRetry(() => import("./features/contracts/ContratosManager"));
const RelatoriosGerenciais = lazyWithRetry(() => import("./features/reports/RelatoriosGerenciais"));
const WhatsAppIA = lazyWithRetry(() => import("./features/whatsapp/WhatsAppIA"));
const AgentesIAManager = lazyWithRetry(() => import("./features/ai-agents/AgentesIAManager"));
// Módulos jurídicos
const ProcessosManager = lazyWithRetry(() => import("./features/processos/ProcessosManager"));
const PrazosManager    = lazyWithRetry(() => import("./features/prazos/PrazosManager"));
const PrazosDashboard  = lazyWithRetry(() => import("./features/prazos/PrazosDashboard"));
const AuditTrail       = lazyWithRetry(() => import("./features/audit/AuditTrail"));
const HonorariosManager = lazyWithRetry(() => import("./features/honorarios/HonorariosManager"));
const DocumentosManager = lazyWithRetry(() => import("./features/documentos/DocumentosManager"));
const UsuariosManager = lazyWithRetry(() => import("./features/users/UsuariosManager"));
const LogsPanel = lazyWithRetry(() => import("./features/logs/LogsPanel"));
const IntegracoesConfig = lazyWithRetry(() => import("./features/settings/IntegracoesConfig"));
const ConfiguracoesGerais = lazyWithRetry(() => import("./features/settings/ConfiguracoesGerais"));
const NotificationsPanel = lazyWithRetry(() => import("./features/notifications/NotificationsPanel"));
const AgentsPlayground = lazyWithRetry(() => import("./pages/AgentsPlayground"));
const MissionControl = lazyWithRetry(() => import("./features/mission-control/MissionControl"));
const SubscriptionManager = lazyWithRetry(() => import("./components/billing/SubscriptionManager"));
const CRMDashboard = lazyWithRetry(() => import("./features/crm/CRMDashboard"));
const LeadDetailPanel = lazyWithRetry(() => import("./features/crm/LeadDetailPanel"));
const AdminStatus = lazyWithRetry(() => import("./pages/AdminStatus"));

// WhatsApp Error Boundary - import direto (necessário para wrapping)
import { WhatsAppErrorBoundary } from "./features/whatsapp/WhatsAppErrorBoundary";

// Prefetch rotas mais acessadas após o idle do browser
if (typeof window !== 'undefined' && 'requestIdleCallback' in window && !Capacitor.isNativePlatform()) {
  window.requestIdleCallback(() => {
    void import("./features/pipeline/PipelineJuridico");
    void import("./features/scheduling/AgendamentosManager");
    void import("./features/crm/CRMDashboard");
    void import("./features/reports/RelatoriosGerenciais");
    void import("./features/processos/ProcessosManager");
    void import("./features/prazos/PrazosManager");
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos — mantém cache por mais tempo
    },
  },
});

// Wrap BrowserRouter com Sentry para tracking de navegação
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

// Rotas válidas para deep links jurify://
const ALLOWED_DEEP_LINK_PATHS = new Set([
  '/dashboard', '/pipeline', '/agenda', '/whatsapp', '/agentes',
  '/contratos', '/clientes', '/notificacoes', '/processos', '/prazos',
  '/honorarios', '/documentos', '/configuracoes', '/relatorios',
  '/usuarios', '/logs', '/integracoes', '/billing',
]);

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listenerPromise = CapacitorApp.addListener('appUrlOpen', (event) => {
      try {
        const url = new URL(event.url);
        const basePath = url.hostname ? `/${url.hostname}` : url.pathname;
        const fullPath = basePath + (url.pathname !== '/' && url.hostname ? url.pathname : '');
        const baseRoute = '/' + (fullPath.split('/')[1] ?? '');
        if (fullPath && fullPath !== '/' && ALLOWED_DEEP_LINK_PATHS.has(baseRoute)) {
          navigate(fullPath + url.search);
        }
      } catch {
        // URL inválida, ignorar silenciosamente
      }
    });

    return () => { void listenerPromise.then(l => l.remove()); };
  }, [navigate]);

  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DeepLinkHandler />
          <AuthProvider>
            <Suspense fallback={null}><CookieBanner /></Suspense>
            <Suspense fallback={<LoadingSpinner fullScreen text="Carregando..." />}>
              <SentryRoutes>
                {/* Rotas públicas */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/termos" element={<TermosDeUso />} />
                <Route path="/privacidade" element={<PoliticaDePrivacidade />} />
                <Route path="/precos" element={<Pricing />} />

                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
                  <Route path="dashboard" element={<Navigate to="/" replace />} />
                  {/* /leads absorvido por Pipeline — redirect para evitar rotas fantasma */}
                  <Route path="leads" element={<Navigate to="/pipeline" replace />} />
                  <Route path="pipeline" element={<ErrorBoundary><PipelineJuridico /></ErrorBoundary>} />
                  <Route path="agendamentos" element={<ErrorBoundary><AgendamentosManager /></ErrorBoundary>} />
                  <Route path="contratos" element={<ErrorBoundary><ContratosManager /></ErrorBoundary>} />
                  <Route path="relatorios" element={<ErrorBoundary><RelatoriosGerenciais /></ErrorBoundary>} />
                  <Route path="whatsapp" element={
                    <WhatsAppErrorBoundary>
                      <WhatsAppIA />
                    </WhatsAppErrorBoundary>
                  } />
                  <Route path="agentes" element={<ErrorBoundary><AgentesIAManager /></ErrorBoundary>} />
                  <Route path="usuarios" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><ErrorBoundary><UsuariosManager /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="logs" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><ErrorBoundary><LogsPanel /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="integracoes" element={<ProtectedRoute requiredRoles={['admin']}><ErrorBoundary><IntegracoesConfig /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="configuracoes" element={<ProtectedRoute requiredRoles={['admin']}><ErrorBoundary><ConfiguracoesGerais /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="notificacoes" element={<ErrorBoundary><NotificationsPanel /></ErrorBoundary>} />
                  {/* /timeline absorvido por Clientes (CRM) */}
                  <Route path="timeline" element={<Navigate to="/crm" replace />} />
                  {/* /planos unificado em Assinatura */}
                  <Route path="planos" element={<Navigate to="/billing" replace />} />
                  {/* /analytics absorvido por Relatórios como aba */}
                  <Route path="analytics" element={<Navigate to="/relatorios" replace />} />
                  <Route path="billing" element={<ErrorBoundary><SubscriptionManager /></ErrorBoundary>} />
                  <Route path="crm" element={<ErrorBoundary><CRMDashboard /></ErrorBoundary>} />
                  {/* /crm/followups acessível via CRM Dashboard */}
                  <Route path="crm/followups" element={<Navigate to="/crm" replace />} />
                  <Route path="crm/lead/:leadId" element={<ErrorBoundary><LeadDetailPanel /></ErrorBoundary>} />
                  {/* Módulos Jurídicos */}
                  <Route path="processos" element={<ErrorBoundary><ProcessosManager /></ErrorBoundary>} />
                  <Route path="prazos" element={<ErrorBoundary><PrazosManager /></ErrorBoundary>} />
                  <Route path="painel-prazos" element={<ErrorBoundary><PrazosDashboard /></ErrorBoundary>} />
                  <Route path="auditoria" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><ErrorBoundary><AuditTrail /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="honorarios" element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']}>
                      <ErrorBoundary><HonorariosManager /></ErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="documentos" element={<ErrorBoundary><DocumentosManager /></ErrorBoundary>} />
                  <Route path="admin/playground" element={<ProtectedRoute requiredRoles={['admin']}><ErrorBoundary><AgentsPlayground /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="admin/mission-control" element={<ProtectedRoute requiredRoles={['admin']}><ErrorBoundary><MissionControl /></ErrorBoundary></ProtectedRoute>} />
                  <Route path="admin/status" element={<ProtectedRoute requiredRoles={['admin']}><ErrorBoundary><AdminStatus /></ErrorBoundary></ProtectedRoute>} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </SentryRoutes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
