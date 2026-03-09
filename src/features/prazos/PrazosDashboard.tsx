import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrazosProcessuais } from '@/hooks/usePrazosProcessuais';
import { usePageTitle } from '@/hooks/usePageTitle';

const TIPO_LABELS: Record<string, string> = {
  audiencia:     'Audiência',
  peticao:       'Petição',
  recurso:       'Recurso',
  manifestacao:  'Manifestação',
  prazo_fatal:   'Prazo Fatal',
  despacho:      'Despacho',
  sentenca:      'Sentença',
  outro:         'Outro',
};

function diasAte(dataStr: string): number {
  return Math.ceil((new Date(dataStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function badgeDias(dias: number) {
  if (dias < 0)  return <Badge className="bg-red-500/15 text-red-600 border-red-200">Vencido</Badge>;
  if (dias === 0) return <Badge className="bg-red-500/15 text-red-600 border-red-200">Hoje</Badge>;
  if (dias === 1) return <Badge className="bg-orange-500/15 text-orange-600 border-orange-200">Amanhã</Badge>;
  if (dias <= 7)  return <Badge className="bg-amber-500/15 text-amber-600 border-amber-200">{dias}d</Badge>;
  return <Badge variant="outline">{new Date(Date.now() + dias * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Badge>;
}

const PrazosDashboard = () => {
  usePageTitle('Painel de Prazos');
  const navigate = useNavigate();

  const { prazos, loading } = usePrazosProcessuais();

  const stats = useMemo(() => {
    const pendentes = prazos.filter(p => p.status === 'pendente');
    const vencidos  = pendentes.filter(p => diasAte(p.data_prazo) < 0);
    const urgentes  = pendentes.filter(p => { const d = diasAte(p.data_prazo); return d >= 0 && d <= 7; });
    const cumpridos = prazos.filter(p => p.status === 'cumprido');

    const porTipo = Object.entries(
      pendentes.reduce<Record<string, number>>((acc, p) => {
        const key = p.tipo || 'outro';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]);

    const proximos = pendentes
      .filter(p => diasAte(p.data_prazo) >= 0)
      .sort((a, b) => new Date(a.data_prazo).getTime() - new Date(b.data_prazo).getTime())
      .slice(0, 10);

    return { pendentes: pendentes.length, vencidos: vencidos.length, urgentes: urgentes.length, cumpridos: cumpridos.length, porTipo, proximos };
  }, [prazos]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Painel de Prazos
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão analítica dos prazos processuais</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate('/prazos')}>
          Gerenciar prazos
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold text-foreground">{stats.pendentes}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Pendentes</p>
          </CardContent>
        </Card>

        <Card className={stats.urgentes > 0 ? 'border-amber-300 dark:border-amber-700' : ''}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className={`h-4 w-4 ${stats.urgentes > 0 ? 'text-amber-500' : 'text-muted-foreground/40'}`} />
              <span className="text-2xl font-bold text-foreground">{stats.urgentes}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Urgentes (≤7d)</p>
          </CardContent>
        </Card>

        <Card className={stats.vencidos > 0 ? 'border-red-300 dark:border-red-700' : ''}>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <XCircle className={`h-4 w-4 ${stats.vencidos > 0 ? 'text-red-500' : 'text-muted-foreground/40'}`} />
              <span className="text-2xl font-bold text-foreground">{stats.vencidos}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Vencidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold text-foreground">{stats.cumpridos}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">Cumpridos</p>
          </CardContent>
        </Card>
      </div>

      {/* Lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Por tipo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Pendentes por tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.porTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum prazo pendente.</p>
            ) : (
              stats.porTipo.map(([tipo, count]) => {
                const pct = stats.pendentes > 0 ? Math.round((count / stats.pendentes) * 100) : 0;
                return (
                  <div key={tipo} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{TIPO_LABELS[tipo] ?? tipo}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Próximos prazos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Próximos vencimentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {stats.proximos.length === 0 ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm py-2">
                <CheckCircle className="h-4 w-4" />
                Nenhum prazo pendente nos próximos dias.
              </div>
            ) : (
              stats.proximos.map(prazo => (
                <div key={prazo.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{prazo.descricao}</p>
                    <p className="text-[11px] text-muted-foreground">{TIPO_LABELS[prazo.tipo] ?? prazo.tipo}</p>
                  </div>
                  {badgeDias(diasAte(prazo.data_prazo))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrazosDashboard;
