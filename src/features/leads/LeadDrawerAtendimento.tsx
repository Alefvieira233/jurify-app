import { Badge } from '@/components/ui/badge';
import type { Lead } from '@/hooks/useLeads';

interface LeadDrawerAtendimentoProps {
  lead: Lead;
}

const prioridadeColor: Record<string, string> = {
  baixa: 'bg-gray-100 text-gray-700',
  media: 'bg-blue-100 text-blue-700',
  alta: 'bg-amber-100 text-amber-700',
  urgente: 'bg-red-100 text-red-700',
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
  } catch {
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
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Responsável">
        {lead.responsavel_id ?? 'Sem responsável'}
      </Field>

      <Field label="Departamento">
        {lead.departamento_id ?? '\u2014'}
      </Field>

      <Field label="Status">
        {lead.status ? (
          <Badge variant="secondary" className="text-xs">{lead.status}</Badge>
        ) : '\u2014'}
      </Field>

      <Field label="Prioridade">
        <Badge className={`text-xs ${prioridadeColor[lead.prioridade] ?? ''}`}>
          {lead.prioridade}
        </Badge>
      </Field>

      <Field label="Conexão">
        {lead.conexao_id ?? '\u2014'}
      </Field>

      <Field label="Última interação">
        {formatDate(lead.ultima_interacao)}
      </Field>

      <Field label="Atribuído em">
        {formatDate(lead.assigned_at)}
      </Field>
    </div>
  );
}
