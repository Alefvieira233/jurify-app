export interface DepartmentInfo {
  nome: string;
  cor: string;
  role: string;
  receber_notificacoes: boolean;
}

const ROLE_BADGE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  administrador: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Admin' },
  admin: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Admin' },
  manager: { bg: 'bg-purple-500/10', text: 'text-purple-500', label: 'Gerente' },
  advogado: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Advogado' },
  comercial: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Comercial' },
  pos_venda: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Pos-venda' },
  suporte: { bg: 'bg-slate-500/10', text: 'text-slate-500', label: 'Suporte' },
  user: { bg: 'bg-sky-500/10', text: 'text-sky-500', label: 'Usuario' },
  viewer: { bg: 'bg-muted/50', text: 'text-muted-foreground', label: 'Visualizador' },
};

export function getRoleBadge(role: string | null) {
  if (!role) return null;
  const cfg = ROLE_BADGE_CONFIG[role] ?? { bg: 'bg-muted/50', text: 'text-muted-foreground', label: role };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
