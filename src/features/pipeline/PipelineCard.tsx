import { memo, useMemo, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { type Lead, type LeadInput } from '@/hooks/useLeads';
import { User, Phone, Scale, Calendar, MoreHorizontal, Pencil, ClipboardList, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import EditarLeadForm from '@/components/forms/EditarLeadForm';
import { STATUS_LABELS, STATUS_LEAD } from '@/schemas/leadSchema';

interface PipelineCardProps {
    lead: Lead;
    index: number;
    onUpdateLead: (id: string, data: Partial<LeadInput>) => Promise<boolean>;
    onRefresh: () => void;
}

export const PipelineCard = memo(({ lead, index, onUpdateLead, onRefresh }: PipelineCardProps) => {
    const [showEditLead, setShowEditLead] = useState(false);
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [showNotesDialog, setShowNotesDialog] = useState(false);
    const [showDateDialog, setShowDateDialog] = useState(false);

    const [statusValue, setStatusValue] = useState<string>(lead.status || 'novo_lead');
    const [notesValue, setNotesValue] = useState<string>(lead.observacoes || '');
    const [dateValue, setDateValue] = useState<string>('');

    const followUpDate = useMemo(() => {
        const metadata = (lead.metadata || {}) as Record<string, unknown>;
        const raw = metadata.next_followup_at as string | undefined;
        if (!raw) return '';
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) return '';
        return parsed.toISOString().slice(0, 10);
    }, [lead.metadata]);

    const openStatusDialog = () => {
        setStatusValue(lead.status || 'novo_lead');
        setShowStatusDialog(true);
    };

    const openNotesDialog = () => {
        setNotesValue(lead.observacoes || '');
        setShowNotesDialog(true);
    };

    const openDateDialog = () => {
        setDateValue(followUpDate);
        setShowDateDialog(true);
    };

    const handleSaveStatus = async () => {
        await onUpdateLead(lead.id, { status: statusValue });
        setShowStatusDialog(false);
    };

    const handleSaveNotes = async () => {
        await onUpdateLead(lead.id, { observacoes: notesValue || null });
        setShowNotesDialog(false);
    };

    const handleSaveDate = async () => {
        const metadata = (lead.metadata || {}) as Record<string, unknown>;
        await onUpdateLead(lead.id, {
            metadata: {
                ...metadata,
                next_followup_at: dateValue ? new Date(dateValue).toISOString() : null,
            },
        });
        setShowDateDialog(false);
    };

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

                        {/* Trello-style card menu */}
                        <div className="absolute top-4 right-4">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="h-8 w-8 flex items-center justify-center rounded-md border border-border/60 bg-background/60 text-foreground/60 hover:text-foreground hover:border-primary/50 transition-all"
                                        onClick={(event) => event.stopPropagation()}
                                        onPointerDown={(event) => event.stopPropagation()}
                                        aria-label="Abrir menu do lead"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem
                                        className="gap-2 text-xs font-semibold"
                                        onClick={openDateDialog}
                                    >
                                        <CalendarClock className="h-3.5 w-3.5 text-primary" />
                                        Alterar data
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="gap-2 text-xs font-semibold"
                                        onClick={openNotesDialog}
                                    >
                                        <ClipboardList className="h-3.5 w-3.5 text-primary" />
                                        Observações
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="gap-2 text-xs font-semibold"
                                        onClick={openStatusDialog}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-primary" />
                                        Alterar status
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="gap-2 text-xs font-semibold"
                                        onClick={() => setShowEditLead(true)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 text-primary" />
                                        Editar lead
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
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

                    {/* Dialogs */}
                    {showEditLead && (
                        <EditarLeadForm
                            open={showEditLead}
                            onOpenChange={setShowEditLead}
                            lead={lead}
                            onSuccess={onRefresh}
                        />
                    )}
                    <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Alterar status</DialogTitle>
                                <DialogDescription>
                                    Atualize o estágio do lead no pipeline.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <Select value={statusValue} onValueChange={setStatusValue}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_LEAD.map((status) => (
                                            <SelectItem key={status} value={status}>
                                                {STATUS_LABELS[status]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveStatus}>Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Observações</DialogTitle>
                                <DialogDescription>
                                    Registre detalhes importantes para o lead.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <Textarea
                                    value={notesValue}
                                    onChange={(event) => setNotesValue(event.target.value)}
                                    placeholder="Escreva observações relevantes..."
                                    rows={5}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowNotesDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveNotes}>Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={showDateDialog} onOpenChange={setShowDateDialog}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Alterar data</DialogTitle>
                                <DialogDescription>
                                    Defina a próxima data de follow-up deste lead.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3">
                                <Input
                                    type="date"
                                    value={dateValue}
                                    onChange={(event) => setDateValue(event.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDateDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSaveDate}>Salvar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}
        </Draggable>
    );
});

export default PipelineCard;
