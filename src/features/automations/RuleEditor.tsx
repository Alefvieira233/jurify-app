import { useState, useCallback, useEffect } from 'react';
import {
  Plus, Trash2, Zap, GitBranch, Save, X,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { STATUS_LEAD, LEAD_STATUS_LABELS } from '@/schemas/leadSchema';
import { PRIORIDADES } from '@/types/crm-operacional';
import type { AutomationRule } from './RegrasManager';
import { EVENT_TYPE_LABELS } from './RegrasManager';

// ── Types ──

interface ConditionDraft {
  _key: string;
  campo: string;
  operador: string;
  valor: string;
}

interface ActionDraft {
  _key: string;
  tipo: string;
  config: Record<string, unknown>;
}

interface RuleEditorProps {
  open: boolean;
  rule: AutomationRule | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Constants ──

const FIELD_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'prioridade', label: 'Prioridade' },
  { value: 'temperatura', label: 'Temperatura' },
  { value: 'area_juridica', label: 'Área Jurídica' },
  { value: 'departamento_id', label: 'Departamento' },
  { value: 'valor_causa', label: 'Valor da Causa' },
  { value: 'origem', label: 'Origem' },
  { value: 'responsavel_id', label: 'Responsável' },
] as const;

const OPERATOR_OPTIONS = [
  { value: 'igual', label: 'Igual a' },
  { value: 'diferente', label: 'Diferente de' },
  { value: 'contem', label: 'Contém' },
  { value: 'nao_contem', label: 'Não contém' },
  { value: 'maior_que', label: 'Maior que' },
  { value: 'menor_que', label: 'Menor que' },
  { value: 'vazio', label: 'Vazio' },
  { value: 'nao_vazio', label: 'Não vazio' },
  { value: 'mudou_para', label: 'Mudou para' },
  { value: 'mudou_de', label: 'Mudou de' },
] as const;

const ACTION_TYPE_OPTIONS = [
  { value: 'enviar_whatsapp', label: 'Enviar WhatsApp' },
  { value: 'enviar_email', label: 'Enviar E-mail' },
  { value: 'alterar_status', label: 'Alterar Status' },
  { value: 'alterar_prioridade', label: 'Alterar Prioridade' },
  { value: 'atribuir_responsavel', label: 'Atribuir Responsável' },
  { value: 'chamar_webhook', label: 'Chamar Webhook' },
  { value: 'executar_agente', label: 'Executar Agente IA' },
  { value: 'notificar_equipe', label: 'Notificar Equipe' },
  { value: 'adicionar_tag', label: 'Adicionar Tag' },
  { value: 'remover_tag', label: 'Remover Tag' },
  { value: 'mover_departamento', label: 'Mover Departamento' },
  { value: 'criar_agendamento', label: 'Criar Agendamento' },
] as const;

const TEMPERATURA_OPTIONS = [
  { value: 'cold', label: 'Frio' },
  { value: 'warm', label: 'Morno' },
  { value: 'hot', label: 'Quente' },
];

const NO_VALUE_OPERATORS = ['vazio', 'nao_vazio'];

let keyCounter = 0;
const nextKey = () => `draft-${++keyCounter}`;

// ── Helpers ──

function isEnumField(campo: string): boolean {
  return ['status', 'prioridade', 'temperatura'].includes(campo);
}

function getEnumOptions(campo: string): { value: string; label: string }[] {
  switch (campo) {
    case 'status':
      return STATUS_LEAD.map((s) => ({ value: s, label: LEAD_STATUS_LABELS[s] }));
    case 'prioridade':
      return PRIORIDADES.map((p) => ({ value: p.value, label: p.label }));
    case 'temperatura':
      return TEMPERATURA_OPTIONS;
    default:
      return [];
  }
}

// ── Component ──

const RuleEditor = ({ open, rule, onClose, onSaved }: RuleEditorProps) => {
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
          supabase.from('automation_rule_conditions').delete().eq('rule_id', rule.id),
          supabase.from('automation_rule_actions').delete().eq('rule_id', rule.id),
        ]);

        // Insert conditions
        if (conditions.length > 0) {
          const { error: condError } = await supabase
            .from('automation_rule_conditions')
            .insert(
              conditions.map((c, i) => ({
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
                rule_id: rule.id,
                tipo: a.tipo,
                config: a.config,
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
                rule_id: ruleId,
                tipo: a.tipo,
                config: a.config,
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

  // ── Render Condition Value Input ──

  const renderConditionValue = (cond: ConditionDraft) => {
    if (NO_VALUE_OPERATORS.includes(cond.operador)) return null;

    if (isEnumField(cond.campo)) {
      const options = getEnumOptions(cond.campo);
      return (
        <Select
          value={cond.valor}
          onValueChange={(v) => updateCondition(cond._key, 'valor', v)}
        >
          <SelectTrigger className="flex-1 rounded-[10px] bg-background/80 border-border/10">
            <SelectValue placeholder="Valor..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    return (
      <Input
        placeholder="Valor..."
        value={cond.valor}
        onChange={(e) => updateCondition(cond._key, 'valor', e.target.value)}
        className="flex-1 rounded-[10px] bg-background/80 border-border/10"
        type={['valor_causa'].includes(cond.campo) ? 'number' : 'text'}
      />
    );
  };

  // ── Render Action Config Form ──

  const renderActionConfig = (action: ActionDraft) => {
    const cfg = action.config;
    const setConfig = (key: string, val: unknown) => updateActionConfig(action._key, key, val);

    switch (action.tipo) {
      case 'enviar_whatsapp':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mensagem Template</Label>
              <Textarea
                placeholder="Olá {{nome}}, sua consulta está agendada para..."
                value={(cfg.template as string) ?? ''}
                onChange={(e) => setConfig('template', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID da Conexão</Label>
              <Input
                placeholder="UUID da conexão WhatsApp"
                value={(cfg.conexao_id as string) ?? ''}
                onChange={(e) => setConfig('conexao_id', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
          </div>
        );

      case 'enviar_email':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Assunto</Label>
              <Input
                placeholder="Assunto do e-mail..."
                value={(cfg.subject as string) ?? ''}
                onChange={(e) => setConfig('subject', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Corpo</Label>
              <Textarea
                placeholder="Corpo do e-mail..."
                value={(cfg.body as string) ?? ''}
                onChange={(e) => setConfig('body', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[80px]"
              />
            </div>
          </div>
        );

      case 'alterar_status':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Novo Status</Label>
            <Select
              value={(cfg.novo_status as string) ?? ''}
              onValueChange={(v) => setConfig('novo_status', v)}
            >
              <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                <SelectValue placeholder="Selecione o status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_LEAD.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'alterar_prioridade':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nova Prioridade</Label>
            <Select
              value={(cfg.nova_prioridade as string) ?? ''}
              onValueChange={(v) => setConfig('nova_prioridade', v)}
            >
              <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                <SelectValue placeholder="Selecione a prioridade..." />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'atribuir_responsavel':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Membro</Label>
            <Input
              placeholder="UUID do membro da equipe"
              value={(cfg.responsavel_id as string) ?? ''}
              onChange={(e) => setConfig('responsavel_id', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'chamar_webhook':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">URL</Label>
              <Input
                placeholder="https://n8n.example.com/webhook/..."
                value={(cfg.url as string) ?? ''}
                onChange={(e) => setConfig('url', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Método</Label>
              <Select
                value={(cfg.method as string) ?? 'POST'}
                onValueChange={(v) => setConfig('method', v)}
              >
                <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Headers (JSON)</Label>
              <Textarea
                placeholder='{"Authorization": "Bearer ..."}'
                value={(cfg.headers as string) ?? ''}
                onChange={(e) => setConfig('headers', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[60px] font-mono text-xs"
              />
            </div>
          </div>
        );

      case 'executar_agente':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Agente</Label>
            <Input
              placeholder="UUID do agente IA"
              value={(cfg.agente_id as string) ?? ''}
              onChange={(e) => setConfig('agente_id', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'notificar_equipe':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mensagem</Label>
            <Textarea
              placeholder="Mensagem para a equipe..."
              value={(cfg.mensagem as string) ?? ''}
              onChange={(e) => setConfig('mensagem', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[80px]"
            />
          </div>
        );

      case 'adicionar_tag':
      case 'remover_tag':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">
              Nome da Tag
            </Label>
            <Input
              placeholder="Nome da tag..."
              value={(cfg.tag_nome as string) ?? ''}
              onChange={(e) => setConfig('tag_nome', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'mover_departamento':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">
              ID do Departamento
            </Label>
            <Input
              placeholder="UUID do departamento"
              value={(cfg.departamento_id as string) ?? ''}
              onChange={(e) => setConfig('departamento_id', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'criar_agendamento':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Título do Agendamento
              </Label>
              <Input
                placeholder="Título..."
                value={(cfg.titulo as string) ?? ''}
                onChange={(e) => setConfig('titulo', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Data (relativa ou fixa)
              </Label>
              <Input
                placeholder="Ex: +3d (3 dias) ou 2026-04-01"
                value={(cfg.data as string) ?? ''}
                onChange={(e) => setConfig('data', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 bg-background/95 backdrop-blur-xl border-border/10 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg">
                {isEditing ? 'Editar Regra' : 'Nova Regra'}
              </SheetTitle>
              <SheetDescription>
                {isEditing
                  ? 'Modifique as condições e ações desta regra.'
                  : 'Defina quando e como a automação deve agir.'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-8 py-6">
            {/* ── Basic Info ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground tracking-wider border border-border/10">
                  Informações Básicas
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome da Regra</Label>
                <Input
                  placeholder="Ex: Notificar equipe ao criar lead quente"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="rounded-[10px] bg-background/80 border-border/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descrição</Label>
                <Textarea
                  placeholder="Descreva o objetivo desta regra..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="rounded-[10px] bg-background/80 border-border/10 min-h-[70px]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Evento Gatilho</Label>
                <Select value={evento} onValueChange={setEvento}>
                  <SelectTrigger className="rounded-[10px] bg-background/80 border-border/10">
                    <SelectValue placeholder="Selecione o evento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-[12px] bg-muted/30 border border-border/10 p-4">
                <div>
                  <p className="text-sm font-medium">Lógica de correspondência</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mt-0.5">
                    {matchLogic === 'todos' ? 'Executar quando TODAS as condições forem atendidas' : 'Executar quando QUALQUER condição for atendida'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${matchLogic === 'todos' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    Todas
                  </span>
                  <Switch
                    checked={matchLogic === 'qualquer'}
                    onCheckedChange={(checked) => setMatchLogic(checked ? 'qualquer' : 'todos')}
                  />
                  <span className={`text-xs ${matchLogic === 'qualquer' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                    Qualquer
                  </span>
                </div>
              </div>
            </section>

            {/* ── Conditions ── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-[10px] uppercase font-bold text-blue-400 tracking-wider border border-blue-500/20">
                  Condições
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addCondition}
                  className="rounded-[10px] gap-1 text-xs hover:bg-muted/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Condição
                </Button>
              </div>

              {conditions.length === 0 && (
                <div className="text-center py-6 rounded-[16px] border border-dashed border-border/10 bg-muted/20">
                  <GitBranch className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma condição definida</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-1">
                    A regra será executada sempre que o evento ocorrer
                  </p>
                </div>
              )}

              {conditions.map((cond, idx) => (
                <div
                  key={cond._key}
                  className="rounded-[16px] border border-border/10 bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Condição {idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-[8px] hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeCondition(cond._key)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Field */}
                    <Select
                      value={cond.campo}
                      onValueChange={(v) => updateCondition(cond._key, 'campo', v)}
                    >
                      <SelectTrigger className="flex-1 rounded-[10px] bg-background/80 border-border/10">
                        <SelectValue placeholder="Campo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Operator */}
                    <Select
                      value={cond.operador}
                      onValueChange={(v) => updateCondition(cond._key, 'operador', v)}
                    >
                      <SelectTrigger className="flex-1 rounded-[10px] bg-background/80 border-border/10">
                        <SelectValue placeholder="Operador..." />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATOR_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Value */}
                    {renderConditionValue(cond)}
                  </div>
                </div>
              ))}
            </section>

            {/* ── Actions ── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-[10px] uppercase font-bold text-emerald-400 tracking-wider border border-emerald-500/20">
                  Ações
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addAction}
                  className="rounded-[10px] gap-1 text-xs hover:bg-muted/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Ação
                </Button>
              </div>

              {actions.length === 0 && (
                <div className="text-center py-6 rounded-[16px] border border-dashed border-border/10 bg-muted/20">
                  <Zap className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma ação definida</p>
                  <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-1">
                    Adicione ações que serão executadas quando as condições forem atendidas
                  </p>
                </div>
              )}

              {actions.map((action, idx) => (
                <div
                  key={action._key}
                  className="rounded-[16px] border border-border/10 bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      Ação {idx + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-[8px] hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeAction(action._key)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Ação</Label>
                    <Select
                      value={action.tipo}
                      onValueChange={(v) => updateActionType(action._key, v)}
                    >
                      <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                        <SelectValue placeholder="Selecione a ação..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPE_OPTIONS.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dynamic config form */}
                  {renderActionConfig(action)}
                </div>
              ))}
            </section>
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="px-6 py-4 border-t border-border/10 gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-[12px]"
            disabled={saveMutation.isPending}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-[12px] shadow-lg shadow-primary/20 gap-2"
            disabled={saveMutation.isPending || !nome.trim() || !evento}
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Regra'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default RuleEditor;
