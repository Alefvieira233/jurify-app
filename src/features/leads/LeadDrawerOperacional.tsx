import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Lead } from '@/hooks/useLeads';

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
  } catch {
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  );
}

export default function LeadDrawerOperacional({ lead }: LeadDrawerOperacionalProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Próxima ação">
        {lead.proxima_acao ?? '\u2014'}
      </Field>

      <Field label="Data da próxima ação">
        {formatDate(lead.proxima_acao_data)}
      </Field>

      <Field label="Etapa do pipeline">
        {lead.pipeline_stage_id ?? '\u2014'}
      </Field>

      <Field label="Temperatura">
        <Badge className={`text-xs ${temperatureStyles[lead.temperature] ?? ''}`}>
          {temperatureLabels[lead.temperature] ?? lead.temperature}
        </Badge>
      </Field>

      <Field label="Probabilidade">
        <div className="flex items-center gap-2">
          <Progress value={lead.probability} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground">{lead.probability}%</span>
        </div>
      </Field>

      <Field label="Lead Score">
        {lead.lead_score}
      </Field>

      <Field label="Valor esperado">
        {formatCurrency(lead.expected_value)}
      </Field>
    </div>
  );
}
