
import React, { useState } from 'react';
import { Plus, Search, Calendar, User, AlertCircle, RefreshCw, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import type { Agendamento } from '@/hooks/useAgendamentos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NovoAgendamentoForm } from '@/components/NovoAgendamentoForm';
import { DetalhesAgendamento } from '@/components/DetalhesAgendamento';

const AgendamentosManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isNovoAgendamentoOpen, setIsNovoAgendamentoOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<Agendamento | null>(null);
  const { agendamentos, loading, error, isEmpty, fetchAgendamentos } = useAgendamentos();

  const filteredAgendamentos = agendamentos.filter(agendamento => {
    const matchesSearch = agendamento.responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesStatus = filterStatus === '' || agendamento.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      agendado: 'bg-blue-100 text-blue-800',
      confirmado: 'bg-green-100 text-green-800',
      reagendado: 'bg-yellow-100 text-yellow-800',
      cancelado: 'bg-red-100 text-red-800',
      realizado: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      agendado: 'Agendado',
      confirmado: 'Confirmado',
      reagendado: 'Reagendado',
      cancelado: 'Cancelado',
      realizado: 'Realizado'
    };
    return labels[status] || status;
  };

  const handleRetry = () => {
    console.log('[Agendamentos] Tentando recarregar agendamentos...');
    fetchAgendamentos();
  };

  const handleOpenDetails = (agendamento: Agendamento) => {
    setSelectedAgendamento(agendamento);
    setIsDetalhesOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetalhesOpen(false);
    setSelectedAgendamento(null);
    fetchAgendamentos();
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestão de Agendamentos</CardTitle>
                <p className="text-gray-600">Gerencie reuniões e compromissos</p>
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
        
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestão de Agendamentos</CardTitle>
                <p className="text-gray-600">Gerencie reuniões e compromissos</p>
              </div>
              <Button onClick={() => setIsNovoAgendamentoOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar agendamentos</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={handleRetry}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Recarregar página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestão de Agendamentos</CardTitle>
                <p className="text-gray-600">Gerencie reuniões e compromissos</p>
              </div>
              <Button onClick={() => setIsNovoAgendamentoOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8">
            <div className="text-center">
              <Calendar className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Nenhum agendamento cadastrado</h3>
              <p className="text-blue-700 mb-6">Comece criando seu primeiro agendamento para organizar suas reuniões.</p>
              <Button onClick={() => setIsNovoAgendamentoOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Content
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Gestão de Agendamentos</CardTitle>
              <p className="text-gray-600">
                Gerencie reuniões e compromissos - {agendamentos.length} agendamentos no total
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={() => setIsNovoAgendamentoOpen(true)} className="bg-amber-500 hover:bg-amber-600">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
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
                placeholder="Buscar por responsável..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">Todos os Status</option>
              <option value="agendado">Agendado</option>
              <option value="confirmado">Confirmado</option>
              <option value="reagendado">Reagendado</option>
              <option value="cancelado">Cancelado</option>
              <option value="realizado">Realizado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Agendamentos */}
      <div className="grid gap-4">
        {filteredAgendamentos.map((agendamento) => (
          <Card key={agendamento.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      {new Date(agendamento.data_hora).toLocaleDateString('pt-BR')} às {new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </h3>
                    <Badge className={getStatusColor(agendamento.status)}>
                      {getStatusLabel(agendamento.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Responsável:</span> {agendamento.responsavel}
                    </div>
                    <div>
                      <span className="font-medium">Área Jurídica:</span> {agendamento.area_juridica}
                    </div>
                    {agendamento.google_event_id && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">Sincronizado com Google Calendar</span>
                      </div>
                    )}
                  </div>

                  {agendamento.observacoes && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Observações:</span> {agendamento.observacoes}
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Criado em: {new Date(agendamento.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDetails(agendamento)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpenDetails(agendamento)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700" onClick={() => handleOpenDetails(agendamento)}>
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgendamentos.length === 0 && searchTerm && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-8">
            <div className="text-center">
              <Search className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-900 mb-2">Nenhum resultado encontrado</h3>
              <p className="text-yellow-700">
                Não foram encontrados agendamentos com o termo "{searchTerm}". Tente ajustar sua busca.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    
      <Dialog open={isNovoAgendamentoOpen} onOpenChange={setIsNovoAgendamentoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <NovoAgendamentoForm onClose={() => {
            setIsNovoAgendamentoOpen(false);
            fetchAgendamentos();
          }} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedAgendamento && (
            <DetalhesAgendamento agendamento={selectedAgendamento} onClose={handleCloseDetails} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgendamentosManager;



