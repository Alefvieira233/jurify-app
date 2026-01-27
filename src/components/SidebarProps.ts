
export interface SidebarProps {
  activeTab: 'dashboard' | 'leads' | 'pipeline' | 'agendamentos' | 'contratos' | 'relatorios' | 'whatsapp' | 'agentes' | 'usuarios' | 'configuracoes' | 'notificacoes' | 'logs' | 'integracoes';
  onTabChange: (tab: 'dashboard' | 'leads' | 'pipeline' | 'agendamentos' | 'contratos' | 'relatorios' | 'whatsapp' | 'agentes' | 'usuarios' | 'configuracoes' | 'notificacoes' | 'logs' | 'integracoes') => void;
  onLogout: () => Promise<void>;
  userProfile: {
    id: string;
    nome_completo: string;
    email: string;
    cargo?: string;
    departamento?: string;
    telefone?: string;
    ativo: boolean;
    data_ultimo_acesso?: string;
    created_at: string;
    updated_at: string;
  };
  hasPermission: (module: string, permission: string) => boolean;
}
