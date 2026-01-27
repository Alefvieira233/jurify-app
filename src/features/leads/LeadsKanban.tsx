import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Card } from '@/components/ui/card';
import { Lead } from '@/hooks/useLeads';
import { MoreVertical, Phone, Mail, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

interface LeadsKanbanProps {
    leads: Lead[];
    onDragEnd: (result: DropResult) => void;
    onEditLead: (lead: Lead) => void;
    onViewTimeline: (leadId: string, leadName: string) => void;
}

const COLUMNS = [
    { id: 'novo_lead', title: 'Novo Lead', color: 'bg-blue-500/10 border-blue-500/30' },
    { id: 'em_qualificacao', title: 'Em Qualificação', color: 'bg-amber-500/10 border-amber-500/30' },
    { id: 'proposta_enviada', title: 'Proposta Enviada', color: 'bg-purple-500/10 border-purple-500/30' },
    { id: 'contrato_assinado', title: 'Contrato Assinado', color: 'bg-emerald-500/10 border-emerald-500/30' },
    { id: 'em_atendimento', title: 'Em Atendimento', color: 'bg-cyan-500/10 border-cyan-500/30' },
    { id: 'lead_perdido', title: 'Perdido', color: 'bg-red-500/10 border-red-500/30' }
];

const LeadsKanban: React.FC<LeadsKanbanProps> = ({ leads, onDragEnd, onEditLead, onViewTimeline }) => {
    const getLeadsByStatus = (status: string) => {
        return leads.filter(lead => lead.status === status);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)]">
                {COLUMNS.map((column, colIndex) => (
                    <motion.div
                        key={column.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: colIndex * 0.1, ease: "easeOut" }}
                        className="min-w-[300px] flex flex-col h-full bg-[hsl(var(--surface-1))] rounded-xl border border-[hsl(var(--border))] shadow-sm"
                    >
                        <div className={`p-3 border-b flex justify-between items-center bg-[hsl(var(--card))] border-[hsl(var(--border))] rounded-t-xl`}>
                            <h3 className="font-serif font-bold text-sm uppercase tracking-widest text-primary">
                                {column.title}
                            </h3>
                            <span className="text-xs font-mono font-medium text-[hsl(var(--accent))] bg-[hsl(var(--accent)_/_0.12)] border border-[hsl(var(--accent)_/_0.3)] px-2 py-0.5 rounded-sm">
                                {getLeadsByStatus(column.id).length}
                            </span>
                        </div>

                        <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                                <ScrollArea className="flex-1 p-3">
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`space-y-3 min-h-[100px] transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-[hsl(var(--muted)_/_0.6)] rounded-lg' : ''}`}
                                    >
                                        <AnimatePresence>
                                            {getLeadsByStatus(column.id).map((lead, index) => (
                                                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            style={{ ...provided.draggableProps.style }}
                                                        >
                                                            <motion.div
                                                                layoutId={lead.id}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                            >
                                                                <Card
                                                                    className={`
                                                                        group relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--accent)_/_0.5)] transition-all duration-200
                                                                        rounded-sm shadow-sm hover:shadow-premium
                                                                        ${snapshot.isDragging ? 'shadow-2xl ring-1 ring-accent rotate-2 scale-105 z-50' : ''}
                                                                    `}
                                                                >
                                                                    {/* Gold Left Border for Status Indicator */}
                                                                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                                    <div className="p-4 space-y-3">
                                                                        <div className="flex justify-between items-start">
                                                                            <h4 className="font-serif font-bold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--accent))] truncate pr-2 text-base">
                                                                                {lead.nome_completo}
                                                                            </h4>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6 -mr-2 -mt-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--accent))]"
                                                                                onClick={(e) => { e.stopPropagation(); onEditLead(lead); }}
                                                                            >
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>

                                                                        <div className="space-y-1.5 border-l-2 border-[hsl(var(--border))] pl-3 ml-1">
                                                                            {lead.valor_causa && (
                                                                                <div className="flex items-center text-xs font-medium text-emerald-200 bg-emerald-500/15 border border-emerald-400/30 w-fit px-1.5 py-0.5 rounded-sm">
                                                                                    <DollarSign className="h-3 w-3 mr-1" />
                                                                                    {Number(lead.valor_causa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                                </div>
                                                                            )}
                                                                            {lead.telefone && (
                                                                                <div className="flex items-center text-[11px] text-[hsl(var(--muted-foreground))] font-mono">
                                                                                    <Phone className="h-3 w-3 mr-2 opacity-50" />
                                                                                    {lead.telefone}
                                                                                </div>
                                                                            )}
                                                                            {lead.email && (
                                                                                <div className="flex items-center text-[11px] text-[hsl(var(--muted-foreground))] font-mono truncate">
                                                                                    <Mail className="h-3 w-3 mr-2 opacity-50" />
                                                                                    {lead.email}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="pt-3 mt-1 border-t border-[hsl(var(--border))] flex justify-between items-center">
                                                                            <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono uppercase tracking-wider">
                                                                                {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                                                                            </span>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-5 text-[10px] uppercase tracking-wide font-bold text-[hsl(var(--accent))] hover:text-[hsl(var(--accent))] hover:bg-transparent p-0 flex items-center gap-1"
                                                                                onClick={(e) => { e.stopPropagation(); onViewTimeline(lead.id, lead.nome_completo); }}
                                                                            >
                                                                                Abrir Deal <span className="text-xs">→</span>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </Card>
                                                            </motion.div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                        </AnimatePresence>
                                        {provided.placeholder}
                                    </div>
                                </ScrollArea>
                            )}
                        </Droppable>
                    </motion.div>
                ))}
            </div>
        </DragDropContext>
    );
};

export default LeadsKanban;


