import type { Lead } from '@/hooks/useLeads';

interface LeadDrawerDadosProps {
  lead: Lead;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value ?? '\u2014'}</p>
    </div>
  );
}

export default function LeadDrawerDados({ lead }: LeadDrawerDadosProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Nome" value={lead.nome ?? lead.nome_completo} />
      <Field label="E-mail" value={lead.email} />
      <Field label="Telefone" value={lead.telefone} />
      <Field label="Área jurídica" value={lead.area_juridica} />
      <Field label="Origem" value={lead.origem} />
      <Field label="Valor da causa" value={formatCurrency(lead.valor_causa)} />
      <Field label="Empresa" value={lead.company_name} />
      <Field label="CPF/CNPJ" value={lead.cpf_cnpj} />
    </div>
  );
}
