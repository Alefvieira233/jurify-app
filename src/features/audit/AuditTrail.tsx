import { useState, useCallback } from 'react';
import { Shield, Download, Trash2, Search, RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivityLogs, type FiltrosLog } from '@/hooks/useActivityLogs';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import ConfirmDialog from '@/components/ConfirmDialog';

const TIPO_CONFIG: Record<string, { label: string; className: string } | undefined> = {
  criacao:  { label: 'Criação',  className: 'bg-emerald-500/15 text-emerald-700 border-emerald-200' },
  edicao:   { label: 'Edição',   className: 'bg-blue-500/15 text-blue-700 border-blue-200' },
  exclusao: { label: 'Exclusão', className: 'bg-red-500/15 text-red-700 border-red-200' },
  login:    { label: 'Login',    className: 'bg-violet-500/15 text-violet-700 border-violet-200' },
  logout:   { label: 'Logout',   className: 'bg-slate-500/15 text-slate-700 border-slate-200' },
  erro:     { label: 'Erro',     className: 'bg-orange-500/15 text-orange-700 border-orange-200' },
  outro:    { label: 'Outro',    className: 'bg-muted text-muted-foreground' },
};

const TIPO_OPTIONS = ['', 'criacao', 'edicao', 'exclusao', 'login', 'logout', 'erro', 'outro'] as const;

const AuditTrail = () => {
  usePageTitle('Trilha de Auditoria');
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [filtros, setFiltros] = useState<FiltrosLog>({});
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoAcao, setTipoAcao] = useState('');
  const [modulo, setModulo] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const { logs, loading, totalCount, fetchLogs, clearOldLogs, exportLogs } = useActivityLogs();

  const applyFilters = useCallback(() => {
    const f: FiltrosLog = {};
    if (tipoAcao) f.tipo_acao = tipoAcao;
    if (modulo.trim()) f.modulo = modulo.trim();
    if (dataInicio) f.data_inicio = dataInicio;
    if (dataFim) f.data_fim = dataFim;
    setFiltros(f);
    void fetchLogs(50, 0, f);
  }, [tipoAcao, modulo, dataInicio, dataFim, fetchLogs]);

  const clearFilters = useCallback(() => {
    setTipoAcao('');
    setModulo('');
    setDataInicio('');
    setDataFim('');
    setFiltros({});
    void fetchLogs(50, 0, {});
  }, [fetchLogs]);

  const handleClearOldLogs = async () => {
    setClearLoading(true);
    await clearOldLogs(90);
    setClearLoading(false);
    setConfirmClear(false);
  };

  const hasFilters = !!(tipoAcao || modulo || dataInicio || dataFim);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Trilha de Auditoria
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Histórico de ações dos usuários — {totalCount} registro{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void exportLogs(filtros)}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar CSV
          </Button>
          {isAdmin && (
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setConfirmClear(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Limpar antigos
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipo de ação</label>
              <select
                value={tipoAcao}
                onChange={e => setTipoAcao(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {TIPO_OPTIONS.map(t => (
                  <option key={t} value={t}>{t ? (TIPO_CONFIG[t]?.label ?? t) : 'Todos'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Módulo</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                <Input
                  value={modulo}
                  onChange={e => setModulo(e.target.value)}
                  placeholder="ex: Contratos, Leads..."
                  className="pl-8 h-9 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">De</label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-9 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Até</label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={applyFilters}>
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtrar
            </Button>
            {hasFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => void fetchLogs(50, 0, filtros)} className="ml-auto">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Eventos recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-25" />
              Nenhum registro encontrado.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {logs.map(log => {
                const tipoConf = TIPO_CONFIG[log.tipo_acao] ?? { label: log.tipo_acao, className: 'bg-muted text-muted-foreground' };
                const dataHora = new Date(log.data_hora);
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3 hover:bg-muted/30 transition-colors">
                    {/* Date */}
                    <div className="w-28 flex-shrink-0 text-right">
                      <p className="text-xs font-medium text-foreground">{dataHora.toLocaleDateString('pt-BR')}</p>
                      <p className="text-[11px] text-muted-foreground">{dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>

                    {/* Badge */}
                    <div className="w-20 flex-shrink-0 pt-0.5">
                      <Badge className={`text-[10px] px-1.5 py-0 ${tipoConf.className}`}>
                        {tipoConf.label}
                      </Badge>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{log.descricao}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-medium">{log.nome_usuario}</span>
                        {log.modulo && <span> · {log.modulo}</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Limpar logs antigos"
        description="Serão removidos todos os logs com mais de 90 dias. Esta ação não pode ser desfeita."
        destructive
        loading={clearLoading}
        onConfirm={() => { void handleClearOldLogs(); }}
      />
    </div>
  );
};

export default AuditTrail;
