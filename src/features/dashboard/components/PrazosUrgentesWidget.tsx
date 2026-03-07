import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrazosProcessuais } from '@/hooks/usePrazosProcessuais';

const PrazosUrgentesWidget = () => {
  const { prazosUrgentes, loading } = usePrazosProcessuais();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />Prazos Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  if (prazosUrgentes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />Prazos Urgentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-emerald-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            Nenhum prazo vencendo nos próximos 7 dias
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Prazos Urgentes
          <Badge variant="destructive" className="ml-auto">{prazosUrgentes.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {prazosUrgentes.map(prazo => {
          const dias = Math.ceil((new Date(prazo.data_prazo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          return (
            <div key={prazo.id} className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{prazo.descricao}</p>
                <p className="text-xs text-muted-foreground">{prazo.tipo}</p>
              </div>
              <Badge className={
                dias <= 1 ? 'bg-red-500/15 text-red-600' :
                dias <= 3 ? 'bg-orange-500/15 text-orange-600' :
                'bg-amber-500/15 text-amber-600'
              }>
                {dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias}d`}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default PrazosUrgentesWidget;
