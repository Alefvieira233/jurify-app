
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

import Sidebar from "@/components/Sidebar";
import Dashboard from "@/features/dashboard/Dashboard";
import LeadsPanel from "@/features/leads/LeadsPanel";
import PipelineJuridico from "@/features/pipeline/PipelineJuridico";
import AgendamentosManager from "@/features/scheduling/AgendamentosManager";
import ContratosManager from "@/features/contracts/ContratosManager";
import RelatoriosGerenciais from "@/features/reports/RelatoriosGerenciais";
import WhatsAppIA from "@/features/whatsapp/WhatsAppIA";
import AgentesIAManager from "@/features/ai-agents/AgentesIAManager";
import UsuariosManager from "@/features/users/UsuariosManager";
import ConfiguracoesGerais from "@/features/settings/ConfiguracoesGerais";
import NotificationsPanel from "@/features/notifications/NotificationsPanel";
import LogsPanel from "@/features/logs/LogsPanel";
import IntegracoesConfig from "@/features/settings/IntegracoesConfig";
import OnboardingFlow from "@/components/OnboardingFlow";
import LoadingSpinner from "@/components/LoadingSpinner";
import TimelineConversas from "@/features/timeline/TimelineConversas";
import { useSearchParams } from "react-router-dom";

type ActiveTab = 'dashboard' | 'leads' | 'pipeline' | 'agendamentos' | 'contratos' | 'relatorios' | 'whatsapp' | 'agentes' | 'usuarios' | 'configuracoes' | 'notificacoes' | 'logs' | 'integracoes' | 'timeline';

const Index = () => {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const validTabs = ['dashboard', 'leads', 'pipeline', 'agendamentos', 'contratos', 'relatorios', 'whatsapp', 'agentes', 'usuarios', 'configuracoes', 'notificacoes', 'logs', 'integracoes', 'timeline'];

  // Tab management from URL
  useEffect(() => {
    const tab = searchParams.get('tab') as ActiveTab;
    if (tab && validTabs.includes(tab)) {
      console.log(`🔄 Navegando para aba: ${tab}`);
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = useCallback((tab: string) => {
    console.log(`🔄 Mudando para aba: ${tab}`);
    setActiveTab(tab as ActiveTab);
    setSearchParams({ tab });
  }, [setSearchParams]);

  const renderContent = useCallback(() => {
    console.log(`📄 Renderizando conteúdo da aba: ${activeTab}`);

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'leads':
        return <LeadsPanel />;
      case 'pipeline':
        return <PipelineJuridico />;
      case 'agendamentos':
        return <AgendamentosManager />;
      case 'contratos':
        return <ContratosManager />;
      case 'relatorios':
        return <RelatoriosGerenciais />;
      case 'whatsapp':
        return <WhatsAppIA />;
      case 'agentes':
        return <AgentesIAManager />;
      case 'usuarios':
        return <UsuariosManager />;
      case 'logs':
        return <LogsPanel />;
      case 'integracoes':
        return <IntegracoesConfig />;
      case 'configuracoes':
        return <ConfiguracoesGerais />;
      case 'notificacoes':
        return <NotificationsPanel />;
      case 'timeline':
        return <TimelineConversas />;
      default:
        return <Dashboard />;
    }
  }, [activeTab]);

  // Show loading only if auth is loading
  if (loading) {
    return <LoadingSpinner fullScreen text="Carregando aplicação..." />;
  }

  // User not authenticated
  if (!user) {
    console.log('🔄 Usuário não autenticado, redirecionando...');
    return <LoadingSpinner fullScreen text="Redirecionando para login..." />;
  }

  // Main application
  return (
    <div className="min-h-screen bg-gray-100 flex">
      <OnboardingFlow />

      <Sidebar
        activeSection={activeTab}
        onSectionChange={handleTabChange}
      />

      <main className="flex-1 p-6 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
};

export default Index;
