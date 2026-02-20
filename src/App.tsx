import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

// Lazy loading para features (carregamento sob demanda)
const Dashboard = lazy(() => import("./features/dashboard/Dashboard"));
const LeadsPanel = lazy(() => import("./features/leads/LeadsPanel"));
const PipelineJuridico = lazy(() => import("./features/pipeline/PipelineJuridico"));
const AgendamentosManager = lazy(() => import("./features/scheduling/AgendamentosManager"));
const ContratosManager = lazy(() => import("./features/contracts/ContratosManager"));
const RelatoriosGerenciais = lazy(() => import("./features/reports/RelatoriosGerenciais"));
const WhatsAppIA = lazy(() => import("./features/whatsapp/WhatsAppIA"));
const AgentesIAManager = lazy(() => import("./features/ai-agents/AgentesIAManager"));
const UsuariosManager = lazy(() => import("./features/users/UsuariosManager"));
const LogsPanel = lazy(() => import("./features/logs/LogsPanel"));
const IntegracoesConfig = lazy(() => import("./features/settings/IntegracoesConfig"));
const ConfiguracoesGerais = lazy(() => import("./features/settings/ConfiguracoesGerais"));
const NotificationsPanel = lazy(() => import("./features/notifications/NotificationsPanel"));
const TimelineConversas = lazy(() => import("./features/timeline/TimelineConversas"));
const AgentsPlayground = lazy(() => import("./pages/AgentsPlayground"));
const MissionControl = lazy(() => import("./features/mission-control/MissionControl"));
const Pricing = lazy(() => import("./pages/Pricing"));
const AnalyticsDashboard = lazy(() => import("./components/analytics/AnalyticsDashboard"));
const SubscriptionManager = lazy(() => import("./components/billing/SubscriptionManager"));
const CRMDashboard = lazy(() => import("./features/crm/CRMDashboard"));
const FollowUpPanel = lazy(() => import("./features/crm/FollowUpPanel"));
const LeadDetailPanel = lazy(() => import("./features/crm/LeadDetailPanel"));

// WhatsApp Error Boundary - import direto (necessário para wrapping)
import { WhatsAppErrorBoundary } from "./features/whatsapp/WhatsAppErrorBoundary";

// Prefetch rotas mais acessadas após o idle do browser
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(() => {
    void import("./features/leads/LeadsPanel");
    void import("./features/pipeline/PipelineJuridico");
    void import("./features/scheduling/AgendamentosManager");
    void import("./features/crm/CRMDashboard");
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutos
    },
  },
});

// Wrap BrowserRouter com Sentry para tracking de navegação
const SentryRoutes = Sentry.withSentryReactRouterV6Routing(Routes);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Suspense fallback={<LoadingSpinner fullScreen text="Carregando..." />}>
              <SentryRoutes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />

                <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Navigate to="/" replace />} />
                  <Route path="leads" element={<LeadsPanel />} />
                  <Route path="pipeline" element={<PipelineJuridico />} />
                  <Route path="agendamentos" element={<AgendamentosManager />} />
                  <Route path="contratos" element={<ContratosManager />} />
                  <Route path="relatorios" element={<RelatoriosGerenciais />} />
                  <Route path="whatsapp" element={
                    <WhatsAppErrorBoundary>
                      <WhatsAppIA />
                    </WhatsAppErrorBoundary>
                  } />
                  <Route path="agentes" element={<AgentesIAManager />} />
                  <Route path="usuarios" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><UsuariosManager /></ProtectedRoute>} />
                  <Route path="logs" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><LogsPanel /></ProtectedRoute>} />
                  <Route path="integracoes" element={<ProtectedRoute requiredRoles={['admin']}><IntegracoesConfig /></ProtectedRoute>} />
                  <Route path="configuracoes" element={<ProtectedRoute requiredRoles={['admin']}><ConfiguracoesGerais /></ProtectedRoute>} />
                  <Route path="notificacoes" element={<NotificationsPanel />} />
                  <Route path="timeline" element={<TimelineConversas />} />
                  <Route path="planos" element={<Pricing />} />
                  <Route path="analytics" element={<AnalyticsDashboard />} />
                  <Route path="billing" element={<SubscriptionManager />} />
                  <Route path="crm" element={<CRMDashboard />} />
                  <Route path="crm/followups" element={<FollowUpPanel />} />
                  <Route path="crm/lead/:leadId" element={<LeadDetailPanel />} />
                  <Route path="admin/playground" element={<ProtectedRoute requiredRoles={['admin']}><AgentsPlayground /></ProtectedRoute>} />
                  <Route path="admin/mission-control" element={<ProtectedRoute requiredRoles={['admin']}><MissionControl /></ProtectedRoute>} />
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
