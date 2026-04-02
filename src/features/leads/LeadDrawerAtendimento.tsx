import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/hooks/useLeads';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useConexoes } from '@/hooks/useConexoes';
import { useLeadTags } from '@/hooks/useTags';
import { TagBadge } from '@/features/tags/TagBadge';
import { LEAD_STATUS_LABELS as STATUS_LABELS } from '@/features/pipeline/pipelineConfig';
import { PRIORIDADES } from '@/types/crm-operacional';

interface LeadDrawerAtendimentoProps {
  lead: Lead;
}

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
    console.warn('[LeadDrawerAtendimento] date format failed:', err);
    return dateStr;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  );
}

export default function LeadDrawerAtendimento({ lead }: LeadDrawerAtendimentoProps) {
  const { activeDepartamentos } = useDepartamentos();
  const { members } = useTeamMembers();
  const { conexoes } = useConexoes();
  const { leadTags } = useLeadTags(lead.id);

  // Resolve human names
  const responsavelNome = lead.responsavel_id
    ? members.find((m) => m.id === lead.responsavel_id)?.nome_completo ?? 'Desconhecido'
    : 'Sem responsável';

  const departamentoNome = lead.departamento_id
    ? activeDepartamentos.find((d) => d.id === lead.departamento_id)?.nome ?? 'Desconhecido'
    : 'Sem departamento';

  const conexaoNome = lead.conexao_id
    ? (conexoes ?? []).find((c) => c.id === lead.conexao_id)?.nome ?? 'Desconhecida'
    : '\u2014';

  const prioridadeConfig = PRIORIDADES.find((p) => p.value === lead.prioridade);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Responsável">
          {responsavelNome}
        </Field>

        <Field label="Departamento">
          {departamentoNome}
        </Field>

        <Field label="Status">
          {lead.status ? (
            <Badge variant="secondary" className="text-xs">
              {STATUS_LABELS[lead.status] ?? lead.status}
            </Badge>
          ) : '\u2014'}
        </Field>

        <Field label="Prioridade">
          <Badge
            className="text-xs"
            style={prioridadeConfig ? { backgroundColor: `${prioridadeConfig.cor}20`, color: prioridadeConfig.cor } : undefined}
          >
            {prioridadeConfig?.label ?? lead.prioridade}
          </Badge>
        </Field>

        <Field label="Conexão">
          {conexaoNome}
        </Field>

        <Field label="Última interação">
          {formatDate(lead.ultima_interacao)}
        </Field>

        <Field label="Atribuído em">
          {formatDate(lead.assigned_at)}
        </Field>

        <Field label="Origem">
          {lead.origem ?? '\u2014'}
        </Field>
      </div>

      {/* Tags */}
      {leadTags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {leadTags.map((lt) =>
              lt.tag ? (
                <TagBadge key={lt.id} nome={lt.tag.nome} cor={lt.tag.cor} size="sm" />
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}
