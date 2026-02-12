
import { useState, useMemo } from 'react';
import { Search, Filter, Plus, RefreshCw, Layers, User } from 'lucide-react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/hooks/use-toast';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useDebounce } from '@/hooks/useDebounce';
import { Skeleton } from '@/components/ui/skeleton';
import NovoLeadForm from '@/components/forms/NovoLeadForm';
import PipelineColumn from './PipelineColumn';

const PIPELINE_STAGES = [
  { id: 'novo_lead', title: 'Captação', color: 'primary' },
  { id: 'em_qualificacao', title: 'Qualificação', color: 'amber' },
  { id: 'proposta_enviada', title: 'Proposta', color: 'indigo' },
  { id: 'contrato_assinado', title: 'Contrato', color: 'emerald' },
  { id: 'em_atendimento', title: 'Execução', color: 'blue' },
  { id: 'lead_perdido', title: 'Arquivados', color: 'rose' }
];
const PipelineJuridico = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterResponsavel, setFilterResponsavel] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const { toast } = useToast();

  const { leads, loading, updateLead, fetchLeads } = useLeads();

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredLeads = useMemo(() => {
    if (!leads) return [];

    return leads.filter(lead => {
      const matchesSearch = lead.nome_completo?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || false;
      const matchesArea = filterArea === '' || lead.area_juridica === filterArea;
      const matchesResponsavel = filterResponsavel === '' || lead.responsavel === filterResponsavel;

      return matchesSearch && matchesArea && matchesResponsavel;
    });
  }, [leads, debouncedSearchTerm, filterArea, filterResponsavel]);

  const groupedLeads = useMemo(() => {
    return PIPELINE_STAGES.reduce((acc, stage) => {
      acc[stage.id] = filteredLeads.filter(lead => lead.status === stage.id);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [filteredLeads]);

  const areasJuridicas = useMemo(() => {
    return [...new Set(leads?.map(lead => lead.area_juridica).filter(Boolean) || [])];
  }, [leads]);

  const responsaveis = useMemo(() => {
    return [...new Set(leads?.map(lead => lead.responsavel).filter(Boolean) || [])];
  }, [leads]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    void (async () => {
      const success = await updateLead(draggableId, { status: destination.droppableId });

      if (success) {
        toast({
          title: "Status Atualizado",
          description: "O lead foi movido com sucesso no pipeline.",
        });
      }
    })();
  };

  const handleRetry = () => void fetchLeads();
  const handleFormSuccess = () => {
    setShowFormModal(false);
    void fetchLeads();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="flex justify-between items-end">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64 bg-white/5" />
            <Skeleton className="h-4 w-96 bg-white/5" />
          </div>
          <Skeleton className="h-12 w-40 bg-primary/20" />
        </div>
        <div className="grid grid-cols-6 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-[600px] rounded-3xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* 🕋 MONOLITH HEADER */}
      <header className="relative p-10 md:p-16 flex flex-col md:flex-row md:items-end justify-between gap-10 reveal-up border-b border-border/50 bg-gradient-to-b from-card to-background">
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-primary/5 border border-primary/20 backdrop-blur-sm">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-7xl md:text-8xl font-black premium-gradient-text tracking-tighter leading-none">
              Pipeline Jurídico
            </h1>
          </div>
          <p className="text-foreground/60 text-xl md:text-2xl font-light tracking-wide leading-relaxed pl-2 border-l-2 border-primary/30">
            Inteligência estratégica em gestão de ativos financeiros.
            <span className="text-primary font-bold ml-2">[{leads.length}] UNIDADES</span> em sincronia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleRetry}
            className="btn-sharp border border-foreground/10 hover:border-foreground/30 text-foreground/50 hover:text-foreground flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-3" />
            Sincronizar
          </button>
          <button
            onClick={() => setShowFormModal(true)}
            className="btn-sharp bg-primary hover:bg-white text-background hover:text-black flex items-center shadow-2xl shadow-primary/20"
          >
            <Plus className="h-5 w-5 mr-3" strokeWidth={3} />
            ADICIONAR LEAD
          </button>
        </div>
      </header>

      {/* 🔍 ELITE FILTERS */}
      <section className="px-10 md:px-16 py-8 flex flex-col lg:flex-row gap-8 items-center bg-card/30 border-b border-border/30 reveal-up" style={{ animationDelay: '0.15s' }}>
        <div className="flex-1 relative w-full group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/20 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Mapear processo por nome ou identificador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-background border border-border py-5 pl-16 pr-8 text-lg font-medium placeholder:text-foreground/20 focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <div className="relative group flex-1 lg:flex-none">
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full lg:w-72 bg-background border border-border py-5 px-8 text-xs font-bold uppercase tracking-widest appearance-none cursor-pointer hover:border-foreground/30 transition-all focus:outline-none focus:border-primary"
            >
              <option value="">FILTRAR ÁREA</option>
              {areasJuridicas.map(area => (
                <option key={area} value={area ?? ''}>{area}</option>
              ))}
            </select>
            <Filter className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/20 pointer-events-none" />
          </div>

          <div className="relative group flex-1 lg:flex-none">
            <select
              value={filterResponsavel}
              onChange={(e) => setFilterResponsavel(e.target.value)}
              className="w-full lg:w-72 bg-background border border-border py-5 px-8 text-xs font-bold uppercase tracking-widest appearance-none cursor-pointer hover:border-foreground/30 transition-all focus:outline-none focus:border-primary"
            >
              <option value="">FILTRAR RESPONSÁVEL</option>
              {responsaveis.map(resp => (
                <option key={resp} value={resp ?? ''}>{resp}</option>
              ))}
            </select>
            <User className="absolute right-6 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/20 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* 🏗️ MONOLITH GRID */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 h-[calc(100vh-450px)] overflow-x-auto overflow-y-hidden reveal-up" style={{ animationDelay: '0.3s' }}>
          {PIPELINE_STAGES.map((stage, stageIndex) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={groupedLeads[stage.id] || []}
              stageIndex={stageIndex}
              onUpdateLead={updateLead}
              onRefresh={handleRetry}
            />
          ))}
        </main>
      </DragDropContext>

      <NovoLeadForm
        open={showFormModal}
        onOpenChange={setShowFormModal}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default PipelineJuridico;

