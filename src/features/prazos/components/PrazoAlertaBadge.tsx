import { Badge } from '@/components/ui/badge';

interface PrazoAlertaBadgeProps {
  dataPrazo: string;
  status: string;
}

export const PrazoAlertaBadge = ({ dataPrazo, status }: PrazoAlertaBadgeProps) => {
  if (status !== 'pendente') {
    const statusMap: Record<string, { label: string; className: string }> = {
      cumprido: { label: 'Cumprido', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' },
      perdido: { label: 'Perdido', className: 'bg-red-500/10 text-red-600 dark:text-red-300' },
      cancelado: { label: 'Cancelado', className: 'bg-slate-500/10 text-slate-500' },
    };
    const s = statusMap[status];
    if (s) return <Badge className={s.className}>{s.label}</Badge>;
    return null;
  }

  const dias = Math.ceil((new Date(dataPrazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (dias < 0) {
    return <Badge className="bg-red-600/20 text-red-700 dark:text-red-300 font-semibold">Vencido ({Math.abs(dias)}d)</Badge>;
  }
  if (dias === 0) {
    return <Badge className="bg-red-500/20 text-red-600 dark:text-red-300 font-semibold">Vence Hoje!</Badge>;
  }
  if (dias <= 3) {
    return <Badge className="bg-red-500/10 text-red-600 dark:text-red-300">{dias}d restante{dias !== 1 ? 's' : ''}</Badge>;
  }
  if (dias <= 7) {
    return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-300">{dias}d restantes</Badge>;
  }
  return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">{dias}d restantes</Badge>;
};

export default PrazoAlertaBadge;
