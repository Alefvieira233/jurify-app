/* eslint-disable react-refresh/only-export-components */
import { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, Edit, Trash2,
  Activity, Filter, GitBranch,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import ConfirmDialog from '@/components/ConfirmDialog';
import RuleEditor from './RuleEditor';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';

// ── Types ──

interface RuleCondition {
  id: string;
  rule_id: string;
  campo: string;
  operador: string;
  valor: string | null;
  ordem: number;
}

interface RuleAction {
  id: string;
  rule_id: string;
  tipo: string;
  config: Record<string, unknown>;
  ordem: number;
}

export interface AutomationRule {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  status: 'ativo' | 'inativo' | 'rascunho';
  evento: string;
  match_logic: 'todos' | 'qualquer';
  prioridade: number;
  execucoes_total: number;
  ultima_execucao: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
}

// ── Constants ──

export const EVENT_TYPE_LABELS: Record<string, string> = {
  lead_criado: 'Lead Criado',
  lead_atualizado: 'Lead Atualizado',
  status_alterado: 'Status Alterado',
  departamento_alterado: 'Departamento Alterado',
  prioridade_alterada: 'Prioridade Alterada',
  tag_adicionada: 'Tag Adicionada',
  tag_removida: 'Tag Removida',
  lead_arquivado: 'Lead Arquivado',
  lead_reativado: 'Lead Reativado',
  agendamento_criado: 'Agendamento Criado',
  ganho: 'Contrato Assinado',
  temperatura_alterada: 'Temperatura Alterada',
  inatividade: 'Inatividade do Lead',
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  lead_criado: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  lead_atualizado: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  status_alterado: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  departamento_alterado: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  prioridade_alterada: 'bg-red-500/15 text-red-400 border-red-500/20',
  tag_adicionada: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  tag_removida: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20',
  lead_arquivado: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  lead_reativado: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  agendamento_criado: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  ganho: 'bg-green-500/15 text-green-400 border-green-500/20',
  temperatura_alterada: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  inatividade: 'bg-muted/50 text-muted-foreground border-border',
};

// ── Component ──

export const RegrasManager = () => {
  usePageTitle('Regras de Automação');
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEvento, setFilterEvento] = useState<string>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({
    open: false, id: '', label: '',
  });

  // ── Fetch rules ──

  const { data: rules = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.automationRules.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('id, tenant_id, nome, descricao, status, evento, match_logic, prioridade, execucoes_total, ultima_execucao, created_by, created_at, updated_at')
        .order('prioridade', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch conditions and actions for all rules
      const ruleIds = (data ?? []).map((r) => r.id);
      if (ruleIds.length === 0) return [];

      const [conditionsRes, actionsRes] = await Promise.all([
        supabase.from('automation_rule_conditions').select('id, rule_id, campo, operador, valor, ordem').in('rule_id', ruleIds).order('ordem'),
        supabase.from('automation_rule_actions').select('id, rule_id, tipo, config, ordem').in('rule_id', ruleIds).order('ordem'),
      ]);

      const conditionsByRule = new Map<string, RuleCondition[]>();
      for (const c of (conditionsRes.data ?? []) as RuleCondition[]) {
        const list = conditionsByRule.get(c.rule_id) ?? [];
        list.push(c);
        conditionsByRule.set(c.rule_id, list);
      }

      const actionsByRule = new Map<string, RuleAction[]>();
      for (const a of (actionsRes.data ?? []) as RuleAction[]) {
        const list = actionsByRule.get(a.rule_id) ?? [];
        list.push(a);
        actionsByRule.set(a.rule_id, list);
      }

      return (data as AutomationRule[]).map((r) => ({
        ...r,
        conditions: conditionsByRule.get(r.id) ?? [],
        actions: actionsByRule.get(r.id) ?? [],
      }));
    },
    enabled: !!profile?.tenant_id,
  });

  // ── Toggle status mutation ──

  const toggleMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from('automation_rules')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.automationRules.all });
    },
    onError: () => {
      toast({ title: 'Erro ao alterar status da regra', variant: 'destructive' });
    },
  });

  // ── Delete mutation ──

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const tenantId = profile?.tenant_id;
      if (!tenantId) throw new Error('Tenant não encontrado');
      // Delete conditions and actions first (cascade should handle, but be explicit)
      await Promise.all([
        supabase.from('automation_rule_conditions').delete().eq('rule_id', id).eq('tenant_id', tenantId),
        supabase.from('automation_rule_actions').delete().eq('rule_id', id).eq('tenant_id', tenantId),
      ]);
      const { error } = await supabase.from('automation_rules').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Regra excluída com sucesso' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.automationRules.all });
      setConfirmDelete({ open: false, id: '', label: '' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir regra', variant: 'destructive' });
    },
  });

  // ── Filtering ──

  const filteredRules = useMemo(() => {
    return rules.filter((r) => {
      const matchSearch =
        !searchTerm ||
        r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.descricao ?? '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchEvento = filterEvento === 'all' || r.evento === filterEvento;
      return matchSearch && matchStatus && matchEvento;
    });
  }, [rules, searchTerm, filterStatus, filterEvento]);

  // ── Handlers ──

  const handleNewRule = useCallback(() => {
    setEditingRule(null);
    setEditorOpen(true);
  }, []);

  const handleEditRule = useCallback((rule: AutomationRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  }, []);

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false);
    setEditingRule(null);
  }, []);

  const handleEditorSaved = useCallback(() => {
    handleEditorClose();
    void queryClient.invalidateQueries({ queryKey: queryKeys.automationRules.all });
  }, [handleEditorClose, queryClient]);

  const handleToggleStatus = useCallback(
    (rule: AutomationRule) => {
      const newStatus = rule.status === 'ativo' ? 'inativo' : 'ativo';
      toggleMutation.mutate({ id: rule.id, newStatus });
    },
    [toggleMutation]
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  // ── Loading state ──

  if (isLoading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-44 rounded-[12px]" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={`skel-${i}`} className="h-32 w-full rounded-[20px]" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──

  if (error) {
    return (
      <div className="space-y-8 pb-12">
        <ErrorState title="Erro ao carregar regras de automação" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Regras de Automação</h1>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider border border-primary/20">
              Motor de Regras
            </span>
          </div>
          <p className="text-muted-foreground">
            Configure regras automáticas de se/então para processar leads, notificações e fluxos do escritório.
          </p>
        </div>

        <Button
          onClick={handleNewRule}
          className="rounded-[12px] shadow-lg shadow-primary/20 gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar regras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-[10px] bg-background/80 backdrop-blur-xl border-border/10"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] rounded-[10px] bg-background/80 backdrop-blur-xl border-border/10">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEvento} onValueChange={setFilterEvento}>
          <SelectTrigger className="w-[200px] rounded-[10px] bg-background/80 backdrop-blur-xl border-border/10">
            <Activity className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Rules List ── */}
      {filteredRules.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Nenhuma regra configurada"
          description="Crie regras de automação para executar ações automaticamente quando eventos acontecerem no seu escritório."
          action={{
            label: 'Criar primeira regra',
            onClick: handleNewRule,
          }}
        />
      ) : (
        <div className="space-y-4">
          {filteredRules.map((rule) => {
            const condCount = rule.conditions?.length ?? 0;
            const actCount = rule.actions?.length ?? 0;
            const isActive = rule.status === 'ativo';

            return (
              <div
                key={rule.id}
                className="group relative rounded-[20px] border border-border/10 bg-background/95 backdrop-blur-xl p-6 transition-all hover:border-border/20 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start gap-4">
                  {/* Status Toggle */}
                  <div className="pt-1">
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => handleToggleStatus(rule)}
                      disabled={toggleMutation.isPending}
                    />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-base font-semibold truncate">{rule.nome}</h3>
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold tracking-wider border ${
                          EVENT_TYPE_COLORS[rule.evento] ?? 'bg-muted/30 text-muted-foreground border-border/10'
                        }`}
                      >
                        {EVENT_TYPE_LABELS[rule.evento] ?? rule.evento}
                      </Badge>
                      {rule.status === 'rascunho' && (
                        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                          Rascunho
                        </Badge>
                      )}
                    </div>

                    {rule.descricao && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                        {rule.descricao}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      <span>
                        {condCount} {condCount === 1 ? 'condição' : 'condições'} • Quando{' '}
                        {rule.match_logic === 'todos' ? 'TODAS' : 'QUALQUER'}
                      </span>
                      <span className="text-border/30">|</span>
                      <span>
                        {actCount} {actCount === 1 ? 'ação' : 'ações'}
                      </span>
                      <span className="text-border/30">|</span>
                      <span>
                        {rule.execucoes_total} {rule.execucoes_total === 1 ? 'execução' : 'execuções'}
                      </span>
                      {rule.ultima_execucao && (
                        <>
                          <span className="text-border/30">|</span>
                          <span>Última: {formatDate(rule.ultima_execucao)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-[10px] hover:bg-muted/30"
                      onClick={() => handleEditRule(rule)}
                      aria-label="Editar regra"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-[10px] hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        setConfirmDelete({ open: true, id: rule.id, label: rule.nome })
                      }
                      aria-label="Excluir regra"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Active indicator glow */}
                {isActive && (
                  <div className="absolute top-0 left-0 w-1 h-full rounded-l-[20px] bg-primary shadow-lg shadow-primary/40" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Rule Editor ── */}
      <RuleEditor
        open={editorOpen}
        rule={editingRule}
        onClose={handleEditorClose}
        onSaved={handleEditorSaved}
      />

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete({ open: false, id: '', label: '' });
        }}
        title="Excluir regra"
        description={`Tem certeza que deseja excluir a regra "${confirmDelete.label}"? Esta ação é irreversível e removerá todas as condições e ações associadas.`}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => {
          void deleteMutation.mutateAsync(confirmDelete.id);
        }}
      />
    </div>
  );
};

export default RegrasManager;
