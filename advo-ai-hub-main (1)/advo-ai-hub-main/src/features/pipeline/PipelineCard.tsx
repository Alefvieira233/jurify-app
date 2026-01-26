import { memo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { type Lead } from '@/hooks/useLeads';
import { User, Phone, Scale, Banknote, Calendar } from 'lucide-react';

interface PipelineCardProps {
    lead: Lead;
    index: number;
}

export const PipelineCard = memo(({ lead, index }: PipelineCardProps) => {
    return (
        <Draggable key={lead.id} draggableId={lead.id} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`relative group/card p-6 border transition-all duration-300 cursor-grab active:cursor-grabbing ${snapshot.isDragging
                        ? 'bg-card border-primary shadow-[0_40px_80px_rgba(0,0,0,0.4)] z-50 scale-[1.02]'
                        : 'bg-background border-border hover:border-primary/40 hover:bg-card hover:-translate-y-1'
                        }`}
                >
                    <div className="relative space-y-6">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-foreground text-xl leading-tight group-hover/card:text-primary transition-colors duration-300" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                {lead.nome_completo}
                            </h4>
                            <div className="bg-foreground/5 px-3 py-1 border border-border">
                                <span className="text-[8px] uppercase font-black tracking-widest text-foreground/40">{lead.origem || 'WEB'}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-[11px] font-medium text-foreground/60">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <span>{lead.telefone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-medium text-foreground/60">
                                <Scale className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate">{lead.area_juridica}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-medium text-foreground/40">
                                <User className="h-3.5 w-3.5" />
                                <span className="truncate">{lead.responsavel || 'SEM RESPONSÁVEL'}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-border flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-[7px] uppercase tracking-[0.2em] font-black text-foreground/30 mb-1">VALOR ESTIMADO</span>
                                <span className="text-sm font-black text-primary tracking-tighter">
                                    {lead.valor_causa ? `R$ ${Number(lead.valor_causa).toLocaleString('pt-BR')}` : 'R$ ---'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/20">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(lead.created_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Drag glow indicator */}
                    {snapshot.isDragging && (
                        <div className="absolute inset-0 border-2 border-primary animate-pulse pointer-events-none" />
                    )}
                </div>
            )}
        </Draggable>
    );
});

export default PipelineCard;
