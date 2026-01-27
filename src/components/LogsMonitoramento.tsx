
import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Trash2,
  Filter,
  Download
} from 'lucide-react';
import { useLogsExecucao } from '@/hooks/useLogsExecucao';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

const LogsMonitoramento = () => {
  const { logs, loading, stats, limparLogs, refetch } = useLogsExecucao();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filteredLogs = logs.filter(log => {
    if (statusFilter === 'todos') return true;
    return log.status === statusFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
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
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatTempo = (tempo: number | null) => {
    if (!tempo) return '-';
    if (tempo < 1000) return `${tempo}ms`;
    return `${(tempo / 1000).toFixed(2)}s`;
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleRefetch = () => {
    refetch();
  };

  const handleLimparLogs = () => {
    limparLogs();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Carregando logs...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitoramento de Execuções</h2>
          <p className="text-gray-600">Acompanhe as execuções dos Agentes IA em tempo real</p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefetch}>
            <Activity className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="destructive" onClick={handleLimparLogs}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Logs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total de Execuções</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sucessos</p>
              <p className="text-2xl font-bold text-green-600">{stats.sucessos}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Erros</p>
              <p className="text-2xl font-bold text-red-600">{stats.erros}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tempo Médio</p>
              <p className="text-2xl font-bold text-purple-600">{formatTempo(stats.tempoMedio)}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="success">Sucessos</SelectItem>
              <SelectItem value="error">Erros</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Input</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <div className="text-sm">
                    {new Date(log.created_at).toLocaleDateString('pt-BR')}
                    <br />
                    <span className="text-gray-500">
                      {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{log.agentes_ia?.nome || 'N/A'}</p>
                    <p className="text-sm text-gray-500">{log.agentes_ia?.tipo_agente}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm" title={log.input_recebido}>
                    {truncateText(log.input_recebido)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(log.status)}>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(log.status)}
                      <span className="capitalize">{log.status}</span>
                    </div>
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatTempo(log.tempo_execucao)}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {log.api_key_usado || 'N/A'}
                  </code>
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Detalhes da Execução</DialogTitle>
                        <DialogDescription>
                          Detalhes completos da execução do agente IA
                        </DialogDescription>
                      </DialogHeader>
                      {selectedLog && (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">Agente:</label>
                              <p className="text-sm">{selectedLog.agentes_ia?.nome}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Status:</label>
                              <Badge className={getStatusColor(selectedLog.status)}>
                                {selectedLog.status}
                              </Badge>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Tempo de Execução:</label>
                              <p className="text-sm">{formatTempo(selectedLog.tempo_execucao)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">API Key:</label>
                              <p className="text-sm">{selectedLog.api_key_usado || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium text-gray-600">Input Recebido:</label>
                            <div className="bg-gray-50 p-3 rounded border text-sm mt-1">
                              {selectedLog.input_recebido}
                            </div>
                          </div>

                          {selectedLog.resposta_ia && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Resposta da IA:</label>
                              <div className="bg-green-50 p-3 rounded border text-sm mt-1">
                                {selectedLog.resposta_ia}
                              </div>
                            </div>
                          )}

                          {selectedLog.erro_detalhes && (
                            <div>
                              <label className="text-sm font-medium text-gray-600">Erro:</label>
                              <div className="bg-red-50 p-3 rounded border text-sm mt-1 text-red-700">
                                {selectedLog.erro_detalhes}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {filteredLogs.length === 0 && (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Nenhuma execução encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsMonitoramento;
