
import React, { useState } from 'react';
import { Activity, Search, Filter, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const LogsPanel = () => {
  const [loading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.agente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.input_recebido?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === '' || log.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
                <p className="text-gray-600">Histórico de execuções e atividades</p>
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
              <Activity className="h-8 w-8 text-purple-600" />
              <div>
                <CardTitle className="text-2xl">Logs do Sistema</CardTitle>
                <p className="text-gray-600">
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por agente ou input..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Execuções Bem-sucedidas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {logs.filter(l => l.status === 'success').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Erros</p>
                <p className="text-2xl font-bold text-gray-900">
                  {logs.filter(l => l.status === 'error').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
                <p className="text-2xl font-bold text-gray-900">
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
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-8">
              <div className="text-center">
                <Activity className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-blue-900 mb-2">Nenhum log encontrado</h3>
                <p className="text-blue-700">
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
                        <h4 className="font-medium text-gray-900">{log.agente_nome}</h4>
                        <p className="text-sm text-gray-600">ID: {log.agente_id}</p>
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
                        <p className="text-sm font-medium text-gray-700 mb-1">Input do Usuário:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {log.input_recebido}
                        </p>
                      </div>

                      {log.resposta_ia && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Resposta da IA:</p>
                          <p className="text-sm text-gray-600 bg-green-50 p-2 rounded">
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
                          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            {log.erro_detalhes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
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
