import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AutomationRule, RuleCondition, RuleAction } from './types';

export function useRegrasData() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      if (!tenantId) throw new Error('Tenant nao encontrado');
      await Promise.all([
        supabase.from('automation_rule_conditions').delete().eq('rule_id', id).eq('tenant_id', tenantId),
        supabase.from('automation_rule_actions').delete().eq('rule_id', id).eq('tenant_id', tenantId),
      ]);
      const { error } = await supabase.from('automation_rules').delete().eq('id', id).eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Regra excluida com sucesso' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.automationRules.all });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir regra', variant: 'destructive' });
    },
  });

  // ── Filtering helper ──

  const filterRules = useCallback(
    (searchTerm: string, filterStatus: string, filterEvento: string) => {
      return rules.filter((r) => {
        const matchSearch =
          !searchTerm ||
          r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.descricao ?? '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchEvento = filterEvento === 'all' || r.evento === filterEvento;
        return matchSearch && matchStatus && matchEvento;
      });
    },
    [rules]
  );

  const handleToggleStatus = useCallback(
    (rule: AutomationRule) => {
      const newStatus = rule.status === 'ativo' ? 'inativo' : 'ativo';
      toggleMutation.mutate({ id: rule.id, newStatus });
    },
    [toggleMutation]
  );

  const invalidateRules = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.automationRules.all });
  }, [queryClient]);

  return {
    rules,
    isLoading,
    error,
    refetch,
    toggleMutation,
    deleteMutation,
    filterRules,
    handleToggleStatus,
    invalidateRules,
  };
}
