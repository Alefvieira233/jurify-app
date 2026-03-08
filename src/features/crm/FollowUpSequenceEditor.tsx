import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Mail,
  GripVertical,
  Zap,
  ArrowRight,
} from 'lucide-react';
import {
  useFollowUpSequences,
  type SequenceStep,
  type TriggerEvent,
  type CreateSequenceInput,
  type FollowUpSequence,
} from '@/hooks/useFollowUpSequences';

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  lead_created: 'Novo Lead Criado',
  proposta_enviada: 'Proposta Enviada',
  sem_resposta_24h: 'Sem Resposta (24h)',
  sem_resposta_48h: 'Sem Resposta (48h)',
  contrato_enviado: 'Contrato Enviado',
  agendamento_criado: 'Agendamento Criado',
  lead_perdido: 'Lead Perdido',
  manual: 'Disparo Manual',
};

const CHANNEL_ICONS = {
  whatsapp: MessageSquare,
  email: Mail,
};

const DEFAULT_STEP: SequenceStep = {
  delay_hours: 1,
  channel: 'whatsapp',
  template: '',
};

const FollowUpSequenceEditor: React.FC = () => {
  const {
    sequences,
    loading,
    isEmpty,
    createSequence,
    updateSequence,
    deleteSequence,
    toggleActive,
  } = useFollowUpSequences();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTrigger, setFormTrigger] = useState<TriggerEvent>('lead_created');
  const [formSteps, setFormSteps] = useState<SequenceStep[]>([{ ...DEFAULT_STEP }]);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormTrigger('lead_created');
    setFormSteps([{ ...DEFAULT_STEP }]);
  }, []);

  const openEdit = useCallback((seq: FollowUpSequence) => {
    setEditingId(seq.id);
    setFormName(seq.name);
    setFormDescription(seq.description || '');
    setFormTrigger(seq.trigger_event);
    setFormSteps(seq.steps.length > 0 ? seq.steps : [{ ...DEFAULT_STEP }]);
    setDialogOpen(true);
  }, []);

  const openCreate = useCallback(() => {
    resetForm();
    setDialogOpen(true);
  }, [resetForm]);

  const addStep = useCallback(() => {
    setFormSteps(prev => [...prev, { ...DEFAULT_STEP, delay_hours: (prev[prev.length - 1]?.delay_hours ?? 0) + 24 }]);
  }, []);

  const removeStep = useCallback((index: number) => {
    setFormSteps(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateStep = useCallback((index: number, field: keyof SequenceStep, value: string | number) => {
    setFormSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    ));
  }, []);

  const handleSave = useCallback(async () => {
    if (!formName.trim() || formSteps.length === 0) return;
    setSaving(true);

    const input: CreateSequenceInput = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      trigger_event: formTrigger,
      steps: formSteps.filter(s => s.template.trim()),
    };

    let success: boolean;
    if (editingId) {
      success = await updateSequence(editingId, input);
    } else {
      success = await createSequence(input);
    }

    setSaving(false);
    if (success) {
      setDialogOpen(false);
      resetForm();
    }
  }, [formName, formDescription, formTrigger, formSteps, editingId, createSequence, updateSequence, resetForm]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Carregando sequências...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Sequências de Follow-Up</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Automatize mensagens de WhatsApp e email com base em eventos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Nova Sequência
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nova'} Sequência</DialogTitle>
              <DialogDescription>
                Configure os passos automáticos de follow-up
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Name & Trigger */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome da Sequência</Label>
                  <Input
                    placeholder="Ex: Boas-vindas novo lead"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Evento Gatilho</Label>
                  <Select value={formTrigger} onValueChange={v => setFormTrigger(v as TriggerEvent)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Descrição (opcional)</Label>
                <Textarea
                  placeholder="Descreva o objetivo desta sequência..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              </div>

              {/* Steps Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Passos da Sequência</Label>
                  <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={addStep}>
                    <Plus className="h-3 w-3" /> Adicionar Passo
                  </Button>
                </div>

                <div className="space-y-2">
                  {formSteps.map((step, idx) => {
                    const ChannelIcon = CHANNEL_ICONS[step.channel];
                    return (
                      <div key={idx} className="relative">
                        {/* Timeline connector */}
                        {idx > 0 && (
                          <div className="absolute left-5 -top-2 w-px h-2 bg-border" />
                        )}
                        <div className="flex items-start gap-2 p-3 rounded-lg border border-border bg-muted/20">
                          {/* Step number */}
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-primary">{idx + 1}</span>
                            </div>
                          </div>

                          {/* Step config */}
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Delay</Label>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min={0}
                                  value={step.delay_hours}
                                  onChange={e => updateStep(idx, 'delay_hours', parseInt(e.target.value) || 0)}
                                  className="h-7 text-xs w-16"
                                />
                                <span className="text-[10px] text-muted-foreground">horas</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Canal</Label>
                              <Select value={step.channel} onValueChange={v => updateStep(idx, 'channel', v)}>
                                <SelectTrigger className="h-7 text-xs">
                                  <div className="flex items-center gap-1">
                                    <ChannelIcon className="h-3 w-3" />
                                    <SelectValue />
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-end justify-end">
                              {formSteps.length > 1 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => removeStep(idx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Template textarea below */}
                        <div className="ml-10 mt-1">
                          <Textarea
                            placeholder={`Mensagem do passo ${idx + 1}... Use {{nome}} para personalizar`}
                            value={step.template}
                            onChange={e => updateStep(idx, 'template', e.target.value)}
                            className="text-xs min-h-[50px]"
                          />
                        </div>

                        {/* Arrow to next step */}
                        {idx < formSteps.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 rotate-90" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-8 text-xs">
                Cancelar
              </Button>
              <Button
                onClick={() => { void handleSave(); }}
                disabled={saving || !formName.trim() || formSteps.every(s => !s.template.trim())}
                className="h-8 text-xs gap-1.5"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Sequência'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-foreground mb-1">Nenhuma sequência criada</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Crie sequências automáticas para engajar leads via WhatsApp e email
            </p>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5" /> Criar Primeira Sequência
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sequence cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sequences.map(seq => (
          <Card key={seq.id} className="border-border hover:shadow-md transition-shadow">
            <CardHeader className="px-4 py-3 flex flex-row items-start justify-between space-y-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <CardTitle className="text-sm font-semibold truncate">{seq.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 ${seq.is_active
                      ? 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                      : 'border-muted text-muted-foreground'
                    }`}
                  >
                    {seq.is_active ? 'Ativa' : 'Inativa'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {TRIGGER_LABELS[seq.trigger_event]} · {seq.steps.length} passo{seq.steps.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Switch
                checked={seq.is_active}
                onCheckedChange={() => { void toggleActive(seq.id, seq.is_active); }}
                className="scale-75"
              />
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              {/* Steps preview */}
              <div className="flex items-center gap-1 mb-3 flex-wrap">
                {seq.steps.slice(0, 4).map((step, i) => {
                  const Icon = CHANNEL_ICONS[step.channel];
                  return (
                    <React.Fragment key={i}>
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted/60 text-[10px]">
                        <Icon className="h-2.5 w-2.5" />
                        <span>{step.delay_hours}h</span>
                      </div>
                      {i < Math.min(seq.steps.length - 1, 3) && (
                        <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/40" />
                      )}
                    </React.Fragment>
                  );
                })}
                {seq.steps.length > 4 && (
                  <span className="text-[10px] text-muted-foreground">+{seq.steps.length - 4}</span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span>Disparos: <strong className="text-foreground">{seq.total_triggered}</strong></span>
                  <span>Concluídos: <strong className="text-foreground">{seq.total_completed}</strong></span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => openEdit(seq)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                    onClick={() => { void deleteSequence(seq.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default FollowUpSequenceEditor;
