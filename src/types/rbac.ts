/**
 * RBAC (Role-Based Access Control) types.
 */

// Roles disponiveis no sistema
export type UserRole = 'admin' | 'manager' | 'user' | 'viewer';

// Recursos do sistema
export type Resource =
  | 'leads'
  | 'contratos'
  | 'agentes_ia'
  | 'usuarios'
  | 'configuracoes'
  | 'relatorios'
  | 'logs'
  | 'integracoes'
  | 'whatsapp'
  | 'agendamentos'
  | 'pipeline';

// Acoes possiveis
export type Action = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'manage';

// Permissao individual
export interface Permission {
  resource: Resource;
  actions: Action[];
}

// Matriz de permissoes por role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Admin: acesso total
  admin: [
    { resource: 'leads', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'contratos', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'agentes_ia', actions: ['create', 'read', 'update', 'delete', 'execute'] },
    { resource: 'usuarios', actions: ['create', 'read', 'update', 'delete', 'manage'] },
    { resource: 'configuracoes', actions: ['read', 'update', 'manage'] },
    { resource: 'relatorios', actions: ['read', 'create'] },
    { resource: 'logs', actions: ['read'] },
    { resource: 'integracoes', actions: ['read', 'update', 'manage'] },
    { resource: 'whatsapp', actions: ['read', 'create', 'update'] },
    { resource: 'agendamentos', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'pipeline', actions: ['read', 'update'] },
  ],

  // Manager: gerencia operacoes, sem usuarios/configuracoes
  manager: [
    { resource: 'leads', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'contratos', actions: ['create', 'read', 'update'] },
    { resource: 'agentes_ia', actions: ['read', 'execute'] },
    { resource: 'usuarios', actions: ['read'] },
    { resource: 'configuracoes', actions: ['read'] },
    { resource: 'relatorios', actions: ['read', 'create'] },
    { resource: 'logs', actions: ['read'] },
    { resource: 'integracoes', actions: ['read'] },
    { resource: 'whatsapp', actions: ['read', 'create'] },
    { resource: 'agendamentos', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'pipeline', actions: ['read', 'update'] },
  ],

  // User: operacoes basicas
  user: [
    { resource: 'leads', actions: ['create', 'read', 'update'] },
    { resource: 'contratos', actions: ['read'] },
    { resource: 'agentes_ia', actions: ['read', 'execute'] },
    { resource: 'usuarios', actions: ['read'] },
    { resource: 'configuracoes', actions: ['read'] },
    { resource: 'relatorios', actions: ['read'] },
    { resource: 'logs', actions: [] },
    { resource: 'integracoes', actions: [] },
    { resource: 'whatsapp', actions: ['read'] },
    { resource: 'agendamentos', actions: ['create', 'read', 'update'] },
    { resource: 'pipeline', actions: ['read'] },
  ],

  // Viewer: somente leitura
  viewer: [
    { resource: 'leads', actions: ['read'] },
    { resource: 'contratos', actions: ['read'] },
    { resource: 'agentes_ia', actions: ['read'] },
    { resource: 'usuarios', actions: [] },
    { resource: 'configuracoes', actions: [] },
    { resource: 'relatorios', actions: ['read'] },
    { resource: 'logs', actions: [] },
    { resource: 'integracoes', actions: [] },
    { resource: 'whatsapp', actions: ['read'] },
    { resource: 'agendamentos', actions: ['read'] },
    { resource: 'pipeline', actions: ['read'] },
  ],
};

// Labels amigaveis para roles
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  user: 'Usuário',
  viewer: 'Visualizador',
};

// Descricoes dos roles
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Acesso total ao sistema, incluindo gerenciamento de usuários e configurações',
  manager: 'Pode gerenciar operações e leads, mas não usuários ou configurações',
  user: 'Acesso as funcionalidades basicas de leads e agentes',
  viewer: 'Acesso somente leitura ao sistema',
};