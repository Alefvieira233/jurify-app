
import { useState, useMemo } from 'react';
import { Activity, Search, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const LogsPanel = () => {
  const [loading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('');
  
  // Dados simulados de logs
  const [logs] = useState([
    {
      id: '1',
      agente_id: 'agent-1',
      agente_nome: 'Assistente Jurídico',
      input_recebido: 'Como funciona o processo de rescisão trabalhista?',
      resposta_ia: 'A rescisão trabalhista é o término do contrato de trabalho...',
      status: 'success',
      tempo_execucao: 1250,
      created_at: new Date().toISOString(),
      n8n_status: 'success'
    },
    {
      id: '2',
      agente_id: 'agent-2',
      agente_nome: 'Qualificador de Leads',
      input_recebido: 'Preciso de ajuda com um processo de divórcio',
      resposta_ia: 'Entendo que você precisa de assistência com divórcio...',
      status: 'success',
      tempo_execucao: 980,
      created_at: new Date(Date.now() - 300000).toISOString(),
      n8n_status: 'success'
    },
    {
      id: '3',
      agente_id: 'agent-1',
      agente_nome: 'Assistente Jurídico',
      input_recebido: 'Teste de conectividade',
      status: 'error',
      erro_detalhes: 'Timeout na conexão com N8N',
      tempo_execucao: 5000,
      created_at: new Date(Date.now() - 600000).toISOString(),
      n8n_status: 'error'
    }
  ]);

  const filteredLogs = useMemo(() => logs.filter(log => {
    const matchesSearch = log.agente_nome?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         log.input_recebido?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || log.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [logs, debouncedSearchTerm, filterStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-200" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-300" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-amber-300" />;
      default:
        return <Activity className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30';
      case 'error':
        return 'bg-red-500/15 text-red-200 border border-red-400/30';
      case 'processing':
        return 'bg-amber-500/15 text-amber-200 border border-amber-400/30';
      default:
        return 'bg-slate-500/15 text-slate-200 border border-slate-400/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'Sucesso';
      case 'error':
        return 'Erro';
      case 'processing':
        return 'Processando';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Logs do Sistema</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">Histórico de execuções e atividades</p>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Activity className="h-8 w-8 text-purple-300" />
              <div>
                <CardTitle className="text-2xl">Logs do Sistema</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">
                  Histórico de execuções e atividades • {logs.length} registros
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] h-4 w-4" />
              <Input
                placeholder="Buscar por agente ou input..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent"
            >
              <option value="">Todos os Status</option>
              <option value="success">Sucesso</option>
              <option value="error">Erro</option>
              <option value="processing">Processando</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-200" />
              <div>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Execuções Bem-sucedidas</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {logs.filter(l => l.status === 'success').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-300" />
              <div>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Erros</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {logs.filter(l => l.status === 'error').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-300" />
              <div>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Tempo Médio</p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {Math.round(logs.reduce((acc, log) => acc + (log.tempo_execucao || 0), 0) / logs.length)}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Logs */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card className="border-blue-500/30 bg-blue-500/10">
            <CardContent className="p-8">
              <div className="text-center">
                <Activity className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">Nenhum log encontrado</h3>
                <p className="text-[hsl(var(--muted-foreground))]">
                  {searchTerm 
                    ? `Não foram encontrados logs com o termo "${searchTerm}".`
                    : 'Aguardando execuções de agentes IA para gerar logs.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h4 className="font-medium text-[hsl(var(--foreground))]">{log.agente_nome}</h4>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">ID: {log.agente_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(log.status)}>
                          {getStatusLabel(log.status)}
                        </Badge>
                        {log.n8n_status && (
                          <Badge variant="outline" className="text-xs">
                            N8N: {log.n8n_status}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">Input do Usuário:</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface-1))] border border-[hsl(var(--border))] p-2 rounded">
                          {log.input_recebido}
                        </p>
                      </div>

                      {log.resposta_ia && (
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--foreground))] mb-1">Resposta da IA:</p>
                          <p className="text-sm text-[hsl(var(--muted-foreground))] bg-emerald-500/10 border border-emerald-500/25 p-2 rounded">
                            {log.resposta_ia.length > 200 
                              ? log.resposta_ia.substring(0, 200) + '...'
                              : log.resposta_ia
                            }
                          </p>
                        </div>
                      )}

                      {log.erro_detalhes && (
                        <div>
                          <p className="text-sm font-medium text-red-700 mb-1">Detalhes do Erro:</p>
                          <p className="text-sm text-red-200 bg-red-500/10 border border-red-500/25 p-2 rounded">
                            {log.erro_detalhes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-[hsl(var(--border))] text-xs text-[hsl(var(--muted-foreground))]">
                      <span>
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                      {log.tempo_execucao && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.tempo_execucao}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default LogsPanel;

