
import React, { useState, useMemo } from 'react';
import { Plus, Search, Eye, Edit, Trash2, AlertCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useDebounce } from '@/hooks/useDebounce';
import TimelineConversas from '@/features/timeline/TimelineConversas';
import NovoLeadForm from '@/components/forms/NovoLeadForm';
import EditarLeadForm from '@/components/forms/EditarLeadForm';
import LeadsKanban from './LeadsKanban';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { DropResult } from '@hello-pangea/dnd';

const LeadsPanel = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const { leads, loading, error, isEmpty, fetchLeads, deleteLead, updateLead } = useLeads();
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Debounce search term para evitar filtros excessivos
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.nome_completo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || false;
      const matchesStatus = filterStatus === '' || lead.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [leads, debouncedSearchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
    const colors = {
      novo_lead: 'bg-blue-500/15 text-blue-200 border border-blue-400/30',
      em_qualificacao: 'bg-amber-500/15 text-amber-200 border border-amber-400/30',
      proposta_enviada: 'bg-purple-500/15 text-purple-200 border border-purple-400/30',
      contrato_assinado: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
      em_atendimento: 'bg-cyan-500/15 text-cyan-200 border border-cyan-400/30',
      lead_perdido: 'bg-red-500/15 text-red-200 border border-red-400/30'
    };
    return (colors as Record<string, string>)[status] || 'bg-slate-500/15 text-slate-200 border border-slate-400/30';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      novo_lead: 'Novo Lead',
      em_qualificacao: 'Em Qualificacao',
      proposta_enviada: 'Proposta Enviada',
      contrato_assinado: 'Contrato Assinado',
      em_atendimento: 'Em Atendimento',
      lead_perdido: 'Lead Perdido'
    };
    return (labels as Record<string, string>)[status] || status;
  };

  const handleRetry = () => {
    console.log('🔄 Tentando recarregar leads...');
    void fetchLeads();
  };

  const handleViewTimeline = (leadId: string, _leadName: string) => {
    setSelectedLead(leadId);
    setShowTimeline(true);
  };

  const handleCloseTimeline = () => {
    setSelectedLead(null);
    setShowTimeline(false);
  };

  const handleFormSuccess = () => {
    setShowFormModal(false);
    void fetchLeads();
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
  };

  const handleEditSuccess = () => {
    setEditingLead(null);
    void fetchLeads();
  };

  const handleDeleteLead = async (id: string, nome: string) => {
    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir o lead "${nome}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (confirmacao) {
      await deleteLead(id);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;

    // Evita chamadas desnecessárias
    if (result.source.droppableId === destination.droppableId) return;

    // Atualiza status do lead
    void updateLead(draggableId, { status: destination.droppableId });
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestao de Leads</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">Gerencie seus leads e oportunidades</p>
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
                <CardTitle className="text-2xl">Gestao de Leads</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">Gerencie seus leads e oportunidades</p>
              </div>
              <Button
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => setShowFormModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar leads</h3>
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
                <CardTitle className="text-2xl">Gestao de Leads</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">Gerencie seus leads e oportunidades</p>
              </div>
              <Button
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => setShowFormModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Lead
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="text-blue-400 mb-4">
                <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Nenhum lead cadastrado</h3>
              <p className="text-blue-700 mb-6">Comece criando seu primeiro lead para começar a gerenciar suas oportunidades de negócio.</p>
              <Button
                className="bg-amber-500 hover:bg-amber-600"
                onClick={() => setShowFormModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro lead
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
      {/* Header Premium */}
      <div className="relative fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1
              className="text-5xl md:text-6xl font-serif font-bold text-primary tracking-tight"
            >
              Deal Flow
            </h1>

            <div className="h-px w-32 bg-accent/50 hidden md:block" />

            {/* Live Badge - Premium Pulse */}
            <div className="flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-sm">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs font-medium uppercase tracking-widest text-accent-dark">
                Live Pipeline
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            {/* View Toggle */}
            <div className="flex bg-[hsl(var(--muted))] p-1 rounded-lg border border-[hsl(var(--border))]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 px-2 ${viewMode === 'list' ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={`h-8 px-2 ${viewMode === 'kanban' ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--accent))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            {/* Refresh Button Premium */}
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="relative group/btn overflow-hidden border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--accent)_/_0.5)] transition-all duration-500"
              aria-label="Atualizar lista de leads"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--accent)_/_0.1)] to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <RefreshCw className="h-4 w-4 mr-2 group-hover/btn:rotate-180 transition-transform duration-700" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Atualizar</span>
            </Button>

            {/* Novo Lead Button Premium - Sharp & Gold */}
            <Button
              onClick={() => setShowFormModal(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 border border-transparent hover:border-accent transition-all duration-300 rounded-sm shadow-md"
            >
              <Plus className="h-4 w-4 mr-2 text-accent" />
              <span className="font-medium tracking-wide">NOVA OPORTUNIDADE</span>
            </Button>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[hsl(var(--muted-foreground))] mt-3 text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
          Gerencie seus leads e oportunidades • <span className="font-semibold text-[hsl(var(--accent))]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{leads.length}</span> leads no total
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] h-4 w-4" />
              <Input
                placeholder="Buscar por nome do lead..."
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
              <option value="novo_lead">Novo Lead</option>
              <option value="em_qualificacao">Em Qualificacao</option>
              <option value="proposta_enviada">Proposta Enviada</option>
              <option value="contrato_assinado">Contrato Assinado</option>
              <option value="em_atendimento">Em Atendimento</option>
              <option value="lead_perdido">Lead Perdido</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* View Content */}
      {viewMode === 'kanban' ? (
        <LeadsKanban
          leads={filteredLeads}
          onDragEnd={handleDragEnd}
          onEditLead={handleEditLead}
          onViewTimeline={handleViewTimeline}
        />
      ) : (
        /* Lista de Leads Premium */
        <div className="grid gap-4">
          {filteredLeads.map((lead, index) => (
            <Card
              key={lead.id}
              className="relative group card-hover rounded-3xl border-[hsl(var(--border))] overflow-hidden fade-in"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {/* Card Glow Effect */}
              <div className="absolute -inset-1 bg-gradient-to-br from-[hsl(var(--accent)_/_0.1)] via-[hsl(var(--primary)_/_0.05)] to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              {/* Shine Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

              <CardContent className="relative p-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3
                        className="text-xl font-bold text-[hsl(var(--foreground))]"
                        style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.02em' }}
                      >
                        {lead.nome_completo}
                      </h3>

                      {/* Premium Status Badge */}
                      <div className="relative group/badge">
                        <div className={`absolute inset-0 ${getStatusColor(lead.status ?? '')} rounded-full blur opacity-50 group-hover/badge:opacity-75 transition-opacity duration-300`} />
                        <Badge className={`relative ${getStatusColor(lead.status ?? '')} px-3 py-1 shadow-sm`}>
                          <span className="font-semibold text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                            {getStatusLabel(lead.status ?? '')}
                          </span>
                        </Badge>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                      <div>
                        <span className="font-medium text-[hsl(var(--foreground))]">Telefone:</span> {lead.telefone || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-[hsl(var(--foreground))]">Email:</span> {lead.email || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium text-[hsl(var(--foreground))]">Area Juridica:</span> {lead.area_juridica}
                      </div>
                      <div>
                        <span className="font-medium text-[hsl(var(--foreground))]">Responsavel:</span> {lead.responsavel}
                      </div>
                      <div>
                        <span className="font-medium text-[hsl(var(--foreground))]">Origem:</span> {lead.origem}
                      </div>
                      {lead.valor_causa && (
                        <div>
                          <span className="font-medium text-[hsl(var(--foreground))]">Valor da Causa:</span> R$ {Number(lead.valor_causa).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>

                    {lead.observacoes && (
                      <div className="text-sm text-[hsl(var(--muted-foreground))]">
                        <span className="font-medium text-[hsl(var(--foreground))]">Observações:</span> {lead.observacoes}
                      </div>
                    )}

                    <div className="text-xs text-[hsl(var(--muted-foreground))]">
                      Criado em: {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    {/* Timeline Button Premium */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewTimeline(lead.id, lead.nome_completo ?? '')}
                      className="relative group/btn overflow-hidden border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:text-[hsl(var(--accent))] hover:bg-[hsl(var(--muted))] hover:border-[hsl(var(--accent)_/_0.5)] transition-all duration-500"
                      aria-label="Ver timeline de conversas"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--accent)_/_0.1)] to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                      <MessageCircle className="relative h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
                    </Button>

                    {/* View Button Premium */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative group/btn overflow-hidden border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:text-blue-300 hover:bg-[hsl(var(--muted))] hover:border-blue-500/50 transition-all duration-500"
                      aria-label="Visualizar detalhes do lead"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                      <Eye className="relative h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
                    </Button>

                    {/* Edit Button Premium */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditLead(lead)}
                      className="relative group/btn overflow-hidden border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:text-purple-300 hover:bg-[hsl(var(--muted))] hover:border-purple-500/50 transition-all duration-500"
                      aria-label="Editar lead"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                      <Edit className="relative h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
                    </Button>

                    {/* Delete Button Premium */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleDeleteLead(lead.id, lead.nome_completo ?? '')}
                      className="relative group/btn overflow-hidden border-[hsl(var(--border))] bg-[hsl(var(--card))] text-red-400 hover:text-red-300 hover:bg-[hsl(var(--muted))] hover:border-red-500/50 transition-all duration-500"
                      aria-label="Excluir lead"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
                      <Trash2 className="relative h-4 w-4 group-hover/btn:scale-110 transition-transform duration-300" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredLeads.length === 0 && debouncedSearchTerm && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-8">
            <div className="text-center">
              <Search className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-yellow-900 mb-2">Nenhum resultado encontrado</h3>
              <p className="text-yellow-700">
                Nao foram encontrados leads com o termo "{debouncedSearchTerm}". Tente ajustar sua busca.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal Timeline de Conversas */}
      {showTimeline && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                Timeline de Conversas - {leads.find(l => l.id === selectedLead)?.nome_completo}
              </h2>
              <Button onClick={handleCloseTimeline} variant="outline" size="sm" aria-label="Fechar timeline">
                ✕
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <TimelineConversas leadId={selectedLead} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Lead */}
      <NovoLeadForm
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={handleFormSuccess}
      />

      {/* Modal Editar Lead */}
      {editingLead && (
        <EditarLeadForm
          open={!!editingLead}
          onOpenChange={(open) => !open && setEditingLead(null)}
          lead={editingLead}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};

export default LeadsPanel;


