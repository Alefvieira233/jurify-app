import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import { createLogger } from '@/lib/logger';

const log = createLogger('LeadDrawerOperacional');
import { useLeads } from '@/hooks/useLeads';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useConexoes } from '@/hooks/useConexoes';
import { PIPELINE_STAGES, LEAD_STATUS_LABELS as STATUS_LABELS } from '@/features/pipeline/pipelineConfig';
import { PRIORIDADES } from '@/types/crm-operacional';
import { useRBAC } from '@/hooks/useRBAC';

interface LeadDrawerOperacionalProps {
  lead: Lead;
}

const temperatureStyles: Record<string, string> = {
  cold: 'bg-blue-100 text-blue-700',
  warm: 'bg-amber-100 text-amber-700',
  hot: 'bg-red-100 text-red-700',
};

const temperatureLabels: Record<string, string> = {
  cold: 'Frio',
  warm: 'Morno',
  hot: 'Quente',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  } catch (err) {
    log.warn('date format failed', { error: String(err) });
    return dateStr;
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function FieldLabel({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground mb-1">{label}</p>;
}

function ReadOnlyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <FieldLabel label={label} />
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

export default function LeadDrawerOperacional({ lead }: LeadDrawerOperacionalProps) {
  const { updateLead } = useLeads();
  const { activeDepartamentos } = useDepartamentos();
  const { members } = useTeamMembers();
  const { conexoes } = useConexoes();
  const { can } = useRBAC();
  const canEdit = can('leads', 'update');

  const [saving, setSaving] = useState<string | null>(null);

  // Inline editable fields
  const [proximaAcao, setProximaAcao] = useState(lead.proxima_acao ?? '');
  const [proximaAcaoData, setProximaAcaoData] = useState(lead.proxima_acao_data?.split('T')[0] ?? '');

  const handleFieldUpdate = useCallback(
    async (field: string, value: unknown) => {
      setSaving(field);
      try {
        await updateLead(lead.id, { [field]: value } as Record<string, unknown>);
      } finally {
        setSaving(null);
      }
    },
    [lead.id, updateLead],
  );

  const handleSaveProximaAcao = useCallback(async () => {
    setSaving('proxima_acao');
    try {
      await updateLead(lead.id, {
        proxima_acao: proximaAcao.trim() || null,
        proxima_acao_data: proximaAcaoData || null,
      } as Record<string, unknown>);
    } finally {
      setSaving(null);
    }
  }, [lead.id, updateLead, proximaAcao, proximaAcaoData]);

  const savingIndicator = (field: string) =>
    saving === field ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : null;

  return (
    <div className="space-y-5">
      {/* Editable operational fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Status */}
        <div>
          <div className="flex items-center gap-1">
            <FieldLabel label="Status" />
            {savingIndicator('status')}
          </div>
          <Select
            value={lead.status ?? ''}
            onValueChange={(v) => { void handleFieldUpdate('status', v); }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecionar status" />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_STAGES.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prioridade */}
        <div>
          <div className="flex items-center gap-1">
            <FieldLabel label="Prioridade" />
            {savingIndicator('prioridade')}
          </div>
          <Select
            value={lead.prioridade}
            onValueChange={(v) => { void handleFieldUpdate('prioridade', v); }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecionar prioridade" />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADES.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.cor }} />
                    {p.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Departamento */}
        <div>
          <div className="flex items-center gap-1">
            <FieldLabel label="Departamento" />
            {savingIndicator('departamento_id')}
          </div>
          <Select
            value={lead.departamento_id ?? '__none__'}
            onValueChange={(v) => { void handleFieldUpdate('departamento_id', v === '__none__' ? null : v); }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sem departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                Sem departamento
              </SelectItem>
              {activeDepartamentos.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.cor }} />
                    {d.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsável */}
        <div>
          <div className="flex items-center gap-1">
            <FieldLabel label="Responsável" />
            {savingIndicator('responsavel_id')}
          </div>
          <Select
            value={lead.responsavel_id ?? '__none__'}
            onValueChange={(v) => { void handleFieldUpdate('responsavel_id', v === '__none__' ? null : v); }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sem responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                Sem responsável
              </SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.nome_completo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conexão */}
        <div>
          <div className="flex items-center gap-1">
            <FieldLabel label="Conexão" />
            {savingIndicator('conexao_id')}
          </div>
          <Select
            value={lead.conexao_id ?? '__none__'}
            onValueChange={(v) => { void handleFieldUpdate('conexao_id', v === '__none__' ? null : v); }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Sem conexão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" className="text-xs text-muted-foreground">
                Sem conexão
              </SelectItem>
              {(conexoes ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Temperatura */}
        <div>
          <div className="flex items-center gap-1">
            <FieldLabel label="Temperatura" />
            {savingIndicator('temperature')}
          </div>
          <Select
            value={lead.temperature}
            onValueChange={(v) => { void handleFieldUpdate('temperature', v); }}
            disabled={!canEdit}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['cold', 'warm', 'hot'] as const).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">
                  <Badge className={`text-[10px] ${temperatureStyles[t]}`}>
                    {temperatureLabels[t]}
                  </Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Próxima ação */}
      <div className="space-y-2">
        <FieldLabel label="Próxima ação" />
        <div className="flex gap-2">
          <Textarea
            value={proximaAcao}
            onChange={(e) => setProximaAcao(e.target.value)}
            placeholder="Descreva a próxima ação..."
            rows={2}
            className="resize-none text-xs"
            disabled={!canEdit}
          />
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={proximaAcaoData}
            onChange={(e) => setProximaAcaoData(e.target.value)}
            className="h-8 text-xs w-40"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => { void handleSaveProximaAcao(); }}
            disabled={!canEdit || saving === 'proxima_acao'}
          >
            {saving === 'proxima_acao' ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Read-only metrics */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Métricas</p>
        <div className="grid grid-cols-2 gap-4">
          <ReadOnlyField label="Probabilidade">
            <div className="flex items-center gap-2">
              <Progress value={lead.probability} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">{lead.probability}%</span>
            </div>
          </ReadOnlyField>

          <ReadOnlyField label="Lead Score">
            {lead.lead_score}
          </ReadOnlyField>

          <ReadOnlyField label="Valor esperado">
            {formatCurrency(lead.expected_value)}
          </ReadOnlyField>

          <ReadOnlyField label="Última interação">
            {formatDate(lead.ultima_interacao)}
          </ReadOnlyField>

          <ReadOnlyField label="Atribuído em">
            {formatDate(lead.assigned_at)}
          </ReadOnlyField>

          <ReadOnlyField label="Etapa do pipeline">
            {lead.pipeline_stage_id ? (STATUS_LABELS[lead.pipeline_stage_id] ?? lead.pipeline_stage_id) : '\u2014'}
          </ReadOnlyField>
        </div>
      </div>
    </div>
  );
}
