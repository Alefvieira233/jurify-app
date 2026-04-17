import { Suspense, useEffect } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
// Capacitor is loaded dynamically only on native platforms to avoid bundling for web users.
// Use isNativePlatform() below instead of importing @capacitor/core at the top level.
const isNativePlatform = typeof (window as unknown as Record<string, unknown>)?.Capacitor !== 'undefined'
  && typeof (window as unknown as Record<string, unknown> & { Capacitor: { isNativePlatform: () => boolean } }).Capacitor?.isNativePlatform === 'function'
  && (window as unknown as Record<string, unknown> & { Capacitor: { isNativePlatform: () => boolean } }).Capacitor.isNativePlatform();
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoadingSpinner from "./components/LoadingSpinner";
import { FeatureErrorBoundary } from "./components/FeatureErrorBoundary";
import { withSentryReactRouterV6Routing } from '@sentry/react';
import { QUERY_STALE_TIME_MS, QUERY_GC_TIME_MS, MAX_RETRY_DELAY_MS } from "./constants/timings";
import { useNetworkBanner } from "@/hooks/useNetworkBanner";
import { createLogger } from "@/lib/logger";

const log = createLogger('App');

// Sentry is loaded asynchronously after first paint so its ~456 KB bundle is
// not on the critical path. Errors thrown during the first ~50 ms (before
// Sentry attaches) fall back to the native ErrorBoundary. Audit P0-2.
if (typeof window !== 'undefined') {
  const start = () => {
    void import('./lib/sentry').then(({ initSentry }) => initSentry());
  };
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number })
      .requestIdleCallback(start, { timeout: 2000 });
  } else {
    // Safari / older browsers: run after first paint.
    setTimeout(start, 0);
  }
}

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
const HomePage = lazyWithRetry(() => import("./features/home/HomePage"));
const Dashboard = lazyWithRetry(() => import("./features/dashboard/Dashboard"));
const PipelineJuridico = lazyWithRetry(() => import("./features/pipeline/PipelineJuridico"));
const KanbanOperacional = lazyWithRetry(() => import("./features/pipeline/KanbanOperacional"));
const AgendamentosManager = lazyWithRetry(() => import("./features/scheduling/AgendamentosManager"));
const TarefasPage = lazyWithRetry(() => import("./features/tarefas/TarefasPage"));
const ContratosManager = lazyWithRetry(() => import("./features/contracts/ContratosManager"));
const RelatoriosGerenciais = lazyWithRetry(() => import("./features/reports/RelatoriosGerenciais"));
const WhatsAppIA = lazyWithRetry(() => import("./features/whatsapp/WhatsAppIA"));
const AgentesIAManager = lazyWithRetry(() => import("./features/ai-agents/AgentesIAManager"));
// Módulos jurídicos
const ProcessosManager = lazyWithRetry(() => import("./features/processos/ProcessosManager"));
const PrazosManager    = lazyWithRetry(() => import("./features/prazos/PrazosManager"));
// PrazosDashboard now embedded in PrazosManager as a tab
const AuditTrail       = lazyWithRetry(() => import("./features/audit/AuditTrail"));
const HonorariosManager = lazyWithRetry(() => import("./features/honorarios/HonorariosManager"));
const DocumentosManager = lazyWithRetry(() => import("./features/documentos/DocumentosManager"));
const UsuariosManager = lazyWithRetry(() => import("./features/users/UsuariosManager"));
const LogsPanel = lazyWithRetry(() => import("./features/logs/LogsPanel"));
const IntegracoesConfig = lazyWithRetry(() => import("./features/settings/IntegracoesConfig"));
const ConfiguracoesPage = lazyWithRetry(() => import("./features/settings/ConfiguracoesPage"));
const SuportePage = lazyWithRetry(() => import("./features/suporte/SuportePage"));
const BaseConhecimento = lazyWithRetry(() => import("./features/ai-agents/BaseConhecimento"));
const FluxosManager = lazyWithRetry(() => import("./features/automations/FluxosManager"));
const RegrasManager = lazyWithRetry(() => import("./features/automations/RegrasManager"));
const NotificationsPanel = lazyWithRetry(() => import("./features/notifications/NotificationsPanel"));
const AgentsPlayground = lazyWithRetry(() => import("./pages/AgentsPlayground"));
const MissionControl = lazyWithRetry(() => import("./features/mission-control/MissionControl"));
const ContatosTable = lazyWithRetry(() => import("./features/contatos/ContatosTable"));
const ConexoesManager = lazyWithRetry(() => import("./features/conexoes/ConexoesManager"));
const DepartamentosManager = lazyWithRetry(() => import("./features/departamentos/DepartamentosManager"));
const TagsManager = lazyWithRetry(() => import("./features/tags/TagsManager"));
const LeadDetailPanel = lazyWithRetry(() => import("./features/crm/LeadDetailPanel"));
const EquipeManager = lazyWithRetry(() => import("./features/equipe/EquipeManager"));
const ArquivadosView = lazyWithRetry(() => import("./features/leads/ArquivadosView"));
const MetricasOperacionais = lazyWithRetry(() => import("./features/reports/MetricasOperacionais"));
const AdminStatus = lazyWithRetry(() => import("./pages/AdminStatus"));

// WhatsApp now uses FeatureErrorBoundary (WhatsAppErrorBoundary retained for standalone use)

// Prefetch rotas mais acessadas após o idle do browser.
// Note: RelatoriosGerenciais, Dashboard and any chart-heavy route are NOT
// prefetched here because they pull in the 460 KB recharts chunk. Those
// routes load their chunk when the user clicks into them. Audit P1 perf.
if (typeof window !== 'undefined' && 'requestIdleCallback' in window && !isNativePlatform) {
  window.requestIdleCallback(() => {
    void import("./features/pipeline/PipelineJuridico");
    void import("./features/scheduling/AgendamentosManager");
    void import("./features/crm/CRMDashboard");
    void import("./features/processos/ProcessosManager");
    void import("./features/prazos/PrazosManager");
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, MAX_RETRY_DELAY_MS),
      refetchOnWindowFocus: false,
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_GC_TIME_MS,
    },
  },
});

// Wrap BrowserRouter com Sentry para tracking de navegação
const SentryRoutes = withSentryReactRouterV6Routing(Routes);

// Rotas válidas para deep links jurify://
const ALLOWED_DEEP_LINK_PATHS = new Set([
  '/home', '/dashboard', '/pipeline', '/agendamentos', '/whatsapp', '/agentes',
  '/contratos', '/clientes', '/notificacoes', '/processos', '/prazos',
  '/honorarios', '/documentos', '/configuracoes', '/relatorios',
  '/usuarios', '/logs', '/integracoes', '/billing', '/conexoes',
  '/departamentos', '/tags', '/suporte', '/base-conhecimento',
  '/fluxos', '/regras', '/equipe', '/arquivados', '/metricas',
  '/tarefas', '/crm', '/auditoria',
]);

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform) return;

    let cleanup: (() => void) | undefined;

    void import('@capacitor/app').then(({ App: CapacitorApp }) => {
      const listenerPromise = CapacitorApp.addListener('appUrlOpen', (event) => {
        try {
          const url = new URL(event.url);
          const basePath = url.hostname ? `/${url.hostname}` : url.pathname;
          const fullPath = basePath + (url.pathname !== '/' && url.hostname ? url.pathname : '');
          const baseRoute = '/' + (fullPath.split('/')[1] ?? '');
          if (fullPath && fullPath !== '/' && ALLOWED_DEEP_LINK_PATHS.has(baseRoute)) {
            navigate(fullPath + url.search);
          }
        } catch (err) {
          log.warn('deep link URL parse failed', { error: String(err) });
        }
      });

      cleanup = () => { void listenerPromise.then(l => l.remove()); };
    });

    return () => { cleanup?.(); };
  }, [navigate]);

  return null;
}

/** Global offline banner — covers public routes not wrapped by Layout. */
function OfflineBanner() {
  const isOffline = useNetworkBanner();
  if (!isOffline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-500 text-yellow-950 text-center py-2 text-sm font-medium">
      Sem conexao com a internet. Algumas funcionalidades podem nao funcionar.
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <OfflineBanner />
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
                  <Route index element={<FeatureErrorBoundary feature="Home"><HomePage /></FeatureErrorBoundary>} />
                  <Route path="home" element={<Navigate to="/" replace />} />
                  <Route path="dashboard" element={<FeatureErrorBoundary feature="Dashboard"><Dashboard /></FeatureErrorBoundary>} />
                  {/* /leads absorvido por Pipeline — redirect para evitar rotas fantasma */}
                  <Route path="leads" element={<Navigate to="/pipeline" replace />} />
                  <Route path="conexoes" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Conexoes"><ConexoesManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="pipeline" element={<FeatureErrorBoundary feature="Pipeline"><KanbanOperacional /></FeatureErrorBoundary>} />
                  <Route path="pipeline/classico" element={<FeatureErrorBoundary feature="Pipeline Classico"><PipelineJuridico /></FeatureErrorBoundary>} />
                  <Route path="agendamentos" element={<FeatureErrorBoundary feature="Agendamentos"><AgendamentosManager /></FeatureErrorBoundary>} />
                  <Route path="tarefas" element={<FeatureErrorBoundary feature="Tarefas"><TarefasPage /></FeatureErrorBoundary>} />
                  <Route path="contratos" element={<FeatureErrorBoundary feature="Contratos"><ContratosManager /></FeatureErrorBoundary>} />
                  <Route path="relatorios" element={<FeatureErrorBoundary feature="Relatorios"><RelatoriosGerenciais /></FeatureErrorBoundary>} />
                  <Route path="whatsapp" element={
                    <FeatureErrorBoundary feature="WhatsApp">
                      <WhatsAppIA />
                    </FeatureErrorBoundary>
                  } />
                  <Route path="agentes" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Agentes IA"><AgentesIAManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="fluxos" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Fluxos"><FluxosManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="regras" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Regras"><RegrasManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="usuarios" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Usuarios"><UsuariosManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="logs" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Logs"><LogsPanel /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="integracoes" element={<ProtectedRoute requiredRoles={['admin']}><FeatureErrorBoundary feature="Integracoes"><IntegracoesConfig /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="configuracoes" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Configuracoes"><ConfiguracoesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="configuracoes/:section" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Configuracoes"><ConfiguracoesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="configuracoes/:section/:subsection" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Configuracoes"><ConfiguracoesPage /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="notificacoes" element={<FeatureErrorBoundary feature="Notificacoes"><NotificationsPanel /></FeatureErrorBoundary>} />
                  {/* /timeline absorvido por Clientes (CRM) */}
                  <Route path="timeline" element={<Navigate to="/crm" replace />} />
                  {/* /planos unificado em Assinatura */}
                  <Route path="planos" element={<Navigate to="/billing" replace />} />
                  {/* /analytics absorvido por Relatórios como aba */}
                  <Route path="analytics" element={<Navigate to="/relatorios" replace />} />
                  {/* billing now lives in configuracoes/plano */}
                  <Route path="crm" element={<FeatureErrorBoundary feature="CRM"><ContatosTable /></FeatureErrorBoundary>} />
                  {/* /crm/followups acessível via CRM Dashboard */}
                  <Route path="crm/followups" element={<Navigate to="/crm" replace />} />
                  <Route path="crm/lead/:leadId" element={<FeatureErrorBoundary feature="CRM"><LeadDetailPanel /></FeatureErrorBoundary>} />
                  {/* Módulos Jurídicos */}
                  <Route path="processos" element={<FeatureErrorBoundary feature="Processos"><ProcessosManager /></FeatureErrorBoundary>} />
                  <Route path="prazos" element={<FeatureErrorBoundary feature="Prazos"><PrazosManager /></FeatureErrorBoundary>} />
                  <Route path="painel-prazos" element={<Navigate to="/prazos?tab=painel" replace />} />
                  <Route path="auditoria" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Auditoria"><AuditTrail /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="honorarios" element={
                    <ProtectedRoute requiredRoles={['admin', 'manager']}>
                      <FeatureErrorBoundary feature="Honorarios"><HonorariosManager /></FeatureErrorBoundary>
                    </ProtectedRoute>
                  } />
                  <Route path="documentos" element={<FeatureErrorBoundary feature="Documentos"><DocumentosManager /></FeatureErrorBoundary>} />
                  <Route path="departamentos" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Departamentos"><DepartamentosManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="tags" element={<FeatureErrorBoundary feature="Tags"><TagsManager /></FeatureErrorBoundary>} />
                  <Route path="equipe" element={<ProtectedRoute requiredRoles={['admin', 'manager']}><FeatureErrorBoundary feature="Equipe"><EquipeManager /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="arquivados" element={<FeatureErrorBoundary feature="Arquivados"><ArquivadosView /></FeatureErrorBoundary>} />
                  <Route path="metricas" element={<FeatureErrorBoundary feature="Metricas"><MetricasOperacionais /></FeatureErrorBoundary>} />
                  <Route path="suporte" element={<FeatureErrorBoundary feature="Suporte"><SuportePage /></FeatureErrorBoundary>} />
                  <Route path="base-conhecimento" element={<ProtectedRoute requiredRoles={['admin', 'manager', 'user']}><FeatureErrorBoundary feature="Base de Conhecimento"><BaseConhecimento /></FeatureErrorBoundary></ProtectedRoute>} />
                  {/* Redirects for old SISTEMA paths → new locations */}
                  <Route path="billing" element={<Navigate to="/configuracoes/plano" replace />} />
                  <Route path="administracao" element={<Navigate to="/configuracoes" replace />} />
                  <Route path="admin/playground" element={<ProtectedRoute requiredRoles={['admin']}><FeatureErrorBoundary feature="Agents Playground"><AgentsPlayground /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="admin/mission-control" element={<ProtectedRoute requiredRoles={['admin']}><FeatureErrorBoundary feature="Mission Control"><MissionControl /></FeatureErrorBoundary></ProtectedRoute>} />
                  <Route path="admin/status" element={<ProtectedRoute requiredRoles={['admin']}><FeatureErrorBoundary feature="Admin Status"><AdminStatus /></FeatureErrorBoundary></ProtectedRoute>} />
                </Route>

              <Route path="*" element={<NotFound />} />
            </SentryRoutes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
