import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AutomationRule, ConditionDraft, ActionDraft } from '../types';
import { NO_VALUE_OPERATORS, nextKey } from '../types';
import type { Json } from '@/integrations/supabase/types';

interface UseRuleEditorFormParams {
  open: boolean;
  rule: AutomationRule | null;
  onSaved: () => void;
}

export const useRuleEditorForm = ({ open, rule, onSaved }: UseRuleEditorFormParams) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isEditing = !!rule;

  // ── Form State ──
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [evento, setEvento] = useState('');
  const [matchLogic, setMatchLogic] = useState<'todos' | 'qualquer'>('todos');
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [actions, setActions] = useState<ActionDraft[]>([]);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      if (rule) {
        setNome(rule.nome);
        setDescricao(rule.descricao ?? '');
        setEvento(rule.evento);
        setMatchLogic(rule.match_logic);
        setConditions(
          (rule.conditions ?? []).map((c) => ({
            _key: nextKey(),
            campo: c.campo,
            operador: c.operador,
            valor: c.valor ?? '',
          }))
        );
        setActions(
          (rule.actions ?? []).map((a) => ({
            _key: nextKey(),
            tipo: a.tipo,
            config: { ...a.config },
          }))
        );
      } else {
        setNome('');
        setDescricao('');
        setEvento('');
        setMatchLogic('todos');
        setConditions([]);
        setActions([]);
      }
    }
  }, [open, rule]);

  // ── Condition Handlers ──

  const addCondition = useCallback(() => {
    setConditions((prev) => [
      ...prev,
      { _key: nextKey(), campo: 'status', operador: 'igual', valor: '' },
    ]);
  }, []);

  const removeCondition = useCallback((key: string) => {
    setConditions((prev) => prev.filter((c) => c._key !== key));
  }, []);

  const updateCondition = useCallback(
    (key: string, field: keyof ConditionDraft, value: string) => {
      setConditions((prev) =>
        prev.map((c) => {
          if (c._key !== key) return c;
          const updated = { ...c, [field]: value };
          // Reset valor when changing campo to an enum or changing operator to vazio/nao_vazio
          if (field === 'campo') updated.valor = '';
          if (field === 'operador' && NO_VALUE_OPERATORS.includes(value)) updated.valor = '';
          return updated;
        })
      );
    },
    []
  );

  // ── Action Handlers ──

  const addAction = useCallback(() => {
    setActions((prev) => [
      ...prev,
      { _key: nextKey(), tipo: 'notificar_equipe', config: {} },
    ]);
  }, []);

  const removeAction = useCallback((key: string) => {
    setActions((prev) => prev.filter((a) => a._key !== key));
  }, []);

  const updateActionType = useCallback((key: string, tipo: string) => {
    setActions((prev) =>
      prev.map((a) => (a._key === key ? { ...a, tipo, config: {} } : a))
    );
  }, []);

  const updateActionConfig = useCallback(
    (key: string, configKey: string, configValue: unknown) => {
      setActions((prev) =>
        prev.map((a) =>
          a._key === key
            ? { ...a, config: { ...a.config, [configKey]: configValue } }
            : a
        )
      );
    },
    []
  );

  // ── Save Mutation ──

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error('Tenant não encontrado');
      if (!nome.trim()) throw new Error('Nome é obrigatório');
      if (!evento) throw new Error('Evento é obrigatório');

      if (isEditing && rule) {
        // Update rule
        const { error: ruleError } = await supabase
          .from('automation_rules')
          .update({
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            evento,
            match_logic: matchLogic,
          })
          .eq('id', rule.id);

        if (ruleError) throw ruleError;

        // Delete old conditions and actions, then re-insert
        await Promise.all([
          supabase.from('automation_rule_conditions').delete().eq('rule_id', rule.id).eq('tenant_id', profile.tenant_id),
          supabase.from('automation_rule_actions').delete().eq('rule_id', rule.id).eq('tenant_id', profile.tenant_id),
        ]);

        // Insert conditions
        if (conditions.length > 0) {
          const { error: condError } = await supabase
            .from('automation_rule_conditions')
            .insert(
              conditions.map((c, i) => ({
                tenant_id: profile.tenant_id,
                rule_id: rule.id,
                campo: c.campo,
                operador: c.operador,
                valor: NO_VALUE_OPERATORS.includes(c.operador) ? null : c.valor || null,
                ordem: i,
              }))
            );
          if (condError) throw condError;
        }

        // Insert actions
        if (actions.length > 0) {
          const { error: actError } = await supabase
            .from('automation_rule_actions')
            .insert(
              actions.map((a, i) => ({
                tenant_id: profile.tenant_id,
                rule_id: rule.id,
                tipo: a.tipo,
                config: a.config as Json,
                ordem: i,
              }))
            );
          if (actError) throw actError;
        }
      } else {
        // Create rule
        const { data: newRule, error: ruleError } = await supabase
          .from('automation_rules')
          .insert({
            tenant_id: profile.tenant_id,
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            evento,
            match_logic: matchLogic,
            status: 'ativo',
            created_by: profile.id,
          })
          .select('id')
          .single();

        if (ruleError || !newRule) throw ruleError ?? new Error('Falha ao criar regra');

        const ruleId = (newRule as { id: string }).id;

        // Insert conditions
        if (conditions.length > 0) {
          const { error: condError } = await supabase
            .from('automation_rule_conditions')
            .insert(
              conditions.map((c, i) => ({
                tenant_id: profile.tenant_id,
                rule_id: ruleId,
                campo: c.campo,
                operador: c.operador,
                valor: NO_VALUE_OPERATORS.includes(c.operador) ? null : c.valor || null,
                ordem: i,
              }))
            );
          if (condError) throw condError;
        }

        // Insert actions
        if (actions.length > 0) {
          const { error: actError } = await supabase
            .from('automation_rule_actions')
            .insert(
              actions.map((a, i) => ({
                tenant_id: profile.tenant_id,
                rule_id: ruleId,
                tipo: a.tipo,
                config: a.config as Json,
                ordem: i,
              }))
            );
          if (actError) throw actError;
        }
      }
    },
    onSuccess: () => {
      toast({ title: isEditing ? 'Regra atualizada com sucesso' : 'Regra criada com sucesso' });
      onSaved();
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao salvar regra',
        description: toUserMessage(err),
        variant: 'destructive',
      });
    },
  });

  const handleSave = useCallback(() => {
    void saveMutation.mutateAsync();
  }, [saveMutation]);

  return {
    isEditing,
    // basic info
    nome,
    setNome,
    descricao,
    setDescricao,
    evento,
    setEvento,
    matchLogic,
    setMatchLogic,
    // conditions
    conditions,
    addCondition,
    removeCondition,
    updateCondition,
    // actions
    actions,
    addAction,
    removeAction,
    updateActionType,
    updateActionConfig,
    // save
    handleSave,
    isSaving: saveMutation.isPending,
  };
};
