import { useState, useMemo } from 'react';
import {
  Activity, Search, AlertCircle, CheckCircle, Clock,
  RefreshCw, ChevronDown, ChevronUp, Trash2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLogsExecucao } from '@/hooks/useLogsExecucao';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type StatusFilter = '' | 'success' | 'error' | 'processing';

const STATUS_CFG = {
  success:    { label: 'Sucesso',      hex: '#059669', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle },
  error:      { label: 'Erro',         hex: '#e11d48', bgClass: 'bg-rose-500/10',    textClass: 'text-rose-600 dark:text-rose-400',       icon: AlertCircle },
  processing: { label: 'Processando',  hex: '#d97706', bgClass: 'bg-amber-500/10',   textClass: 'text-amber-600 dark:text-amber-400',     icon: Clock       },
} as const;

import { relativeTime } from '@/utils/formatting';

const LogsPanel = () => {
  const { logs, loading, stats, refetch, limparLogs } = useLogsExecucao();
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm]       = useState('');
  const [filterStatus, setFilterStatus]   = useState<StatusFilter>('');
  const [expandedKey, setExpandedKey]     = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const isAdmin = profile?.role === 'admin';

  const filtered = useMemo(() => logs.filter(log => {
    const name    = log.agentes_ia?.nome ?? '';
    const matchSearch = !debouncedSearch
      || name.toLowerCase().includes(debouncedSearch.toLowerCase())
      || log.input_recebido.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchStatus = !filterStatus || log.status === filterStatus;
    return matchSearch && matchStatus;
  }), [logs, debouncedSearch, filterStatus]);

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Logs do Sistema</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Carregando...</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-lg border border-border/50">
              <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-3 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Logs do Sistema</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {stats.total} execuções · {stats.erros > 0 ? `${stats.erros} erros` : 'sem erros'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                type="button"
                onClick={() => { void limparLogs(); }}
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/8 transition-colors"
                title="Limpar logs antigos (30+ dias)"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => { void refetch(); }}
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted transition-colors"
              title="Atualizar"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Stats pills */}
        <div className="flex items-center gap-2 mt-2.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/8 border border-emerald-500/15">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{stats.sucessos}</span>
            <span className="text-[10px] text-muted-foreground/60">sucesso</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/8 border border-rose-500/15">
            <AlertCircle className="h-3 w-3 text-rose-500" />
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{stats.erros}</span>
            <span className="text-[10px] text-muted-foreground/60">erros</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/8 border border-blue-500/15">
            <Clock className="h-3 w-3 text-blue-500" />
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
              {Math.round(stats.tempoMedio)}ms
            </span>
            <span className="text-[10px] text-muted-foreground/60">médio</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground/40" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar agente ou input..."
              className="pl-7 h-7 text-xs bg-muted/40 border-border/50 focus-visible:ring-1"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as StatusFilter)}
            className="h-7 px-2 text-xs rounded-md border border-border/50 bg-muted/40 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Todos</option>
            <option value="success">Sucesso</option>
            <option value="error">Erro</option>
            <option value="processing">Processando</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Activity className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {searchTerm ? 'Nenhum resultado' : 'Nenhuma execução registrada'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {searchTerm ? `Sem resultados para "${searchTerm}"` : 'Aguardando execuções dos agentes IA'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(log => {
              const key       = `${log.agente_id}-${log.created_at}`;
              const isExpanded = expandedKey === key;
              const cfg        = STATUS_CFG[log.status] ?? STATUS_CFG.success;
              const Icon       = cfg.icon;
              const agentName  = log.agentes_ia?.nome ?? 'Agente Desconhecido';
              const agentType  = log.agentes_ia?.tipo_agente;

              return (
                <div
                  key={key}
                  className="rounded-lg border border-border/50 bg-card overflow-hidden"
                >
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? null : key)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    {/* Status dot */}
                    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', cfg.bgClass)}>
                      <Icon className={cn('h-3 w-3', cfg.textClass)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{agentName}</p>
                          {agentType && (
                            <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">{agentType}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full', cfg.bgClass, cfg.textClass)}>
                            {cfg.label}
                          </span>
                          {log.tempo_execucao != null && (
                            <span className="text-[10px] text-muted-foreground/50 tabular-nums flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {log.tempo_execucao}ms
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/40 tabular-nums">
                            {relativeTime(log.created_at)}
                          </span>
                          {isExpanded
                            ? <ChevronUp className="h-3 w-3 text-muted-foreground/40" />
                            : <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
                          }
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground/65 mt-0.5 truncate">
                        {log.input_recebido}
                      </p>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-border/40 space-y-2.5 pt-3">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Input</p>
                        <p className="text-xs text-foreground/80 bg-muted/40 rounded px-2.5 py-2 leading-relaxed">
                          {log.input_recebido}
                        </p>
                      </div>

                      {log.resposta_ia && (
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Resposta IA</p>
                          <p className="text-xs text-foreground/80 bg-emerald-500/5 border border-emerald-500/15 rounded px-2.5 py-2 leading-relaxed">
                            {log.resposta_ia.length > 300 ? log.resposta_ia.slice(0, 300) + '\u2026' : log.resposta_ia}
                          </p>
                        </div>
                      )}

                      {log.erro_detalhes && (
                        <div>
                          <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-1">Detalhes do Erro</p>
                          <p className="text-xs text-rose-600 dark:text-rose-300 bg-rose-500/8 border border-rose-500/20 rounded px-2.5 py-2 leading-relaxed">
                            {log.erro_detalhes}
                          </p>
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground/40 tabular-nums">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsPanel;
