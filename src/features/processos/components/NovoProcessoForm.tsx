import { useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFormDraftPersistence } from '@/hooks/useDraftPersistence';
import { DraftRecoveryBanner } from '@/components/ui/DraftRecoveryBanner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  processoFormSchema,
  type ProcessoFormData,
  TIPOS_ACAO,
  FASES_PROCESSUAIS,
  POSICOES,
  STATUS_PROCESSO,
  TIPO_ACAO_LABELS,
  FASE_LABELS,
  POSICAO_LABELS,
  PROCESSO_STATUS_LABELS,
} from '@/schemas/processoSchema';
import type { Processo } from '@/hooks/useProcessos';

interface NovoProcessoFormProps {
  onSubmit: (data: ProcessoFormData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Processo | null;
}

const NEW_DEFAULTS: Partial<ProcessoFormData> = {
  tipo_acao: 'civel',
  fase_processual: 'conhecimento',
  posicao: 'autor',
  status: 'ativo',
};

// Mirrors RHF's valueAsNumber: empty → NaN
const toNumber = (v: string): number => (v === '' ? Number.NaN : Number(v));
const displayNumber = (v: unknown): string | number =>
  v == null || (typeof v === 'number' && Number.isNaN(v)) ? '' : (v as number);

const NovoProcessoForm = ({ onSubmit, onCancel, loading, initialData }: NovoProcessoFormProps) => {
  const { profile } = useAuth();
  const isEditing = !!initialData;

  // Draft persistence — only for new processos
  const { hasDraft, saveDraft, loadDraft, clearDraft } = useFormDraftPersistence<ProcessoFormData>({
    formName: 'novo-processo',
    tenantId: profile?.tenant_id,
  });

  const form = useForm<ProcessoFormData>({
    resolver: zodResolver(processoFormSchema),
    defaultValues: initialData ? {
      lead_id: initialData.lead_id,
      numero_processo: initialData.numero_processo,
      tribunal: initialData.tribunal,
      vara: initialData.vara,
      comarca: initialData.comarca,
      tipo_acao: initialData.tipo_acao as ProcessoFormData['tipo_acao'],
      area_juridica: initialData.area_juridica,
      fase_processual: initialData.fase_processual as ProcessoFormData['fase_processual'],
      posicao: initialData.posicao as ProcessoFormData['posicao'],
      valor_causa: initialData.valor_causa,
      valor_honorario_acordado: initialData.valor_honorario_acordado,
      data_distribuicao: initialData.data_distribuicao,
      status: initialData.status as ProcessoFormData['status'],
      observacoes: initialData.observacoes,
    } : NEW_DEFAULTS,
  });

  const {
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting },
  } = form;

  // Save draft on form value changes (only for new processos)
  useEffect(() => {
    if (isEditing) return;
    const subscription = watch((values) => {
      saveDraft(values as Partial<ProcessoFormData>);
    });
    return () => subscription.unsubscribe();
  }, [watch, saveDraft, isEditing]);

  const handleRestoreDraft = useCallback(() => {
    const draft = loadDraft();
    if (draft) {
      reset({ ...NEW_DEFAULTS, ...draft } as ProcessoFormData);
    }
  }, [loadDraft, reset]);

  const handleDiscardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  const handleFormSubmit = async (data: ProcessoFormData) => {
    const ok = await onSubmit(data);
    if (ok) clearDraft();
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => { void handleSubmit(handleFormSubmit)(e); }} className="space-y-4">
        {/* Draft recovery banner */}
        {!isEditing && hasDraft && (
          <DraftRecoveryBanner onRestore={handleRestoreDraft} onDiscard={handleDiscardDraft} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="numero_processo"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Número do Processo</FormLabel>
                <FormControl>
                  <Input placeholder="0000000-00.0000.0.00.0000" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tipo_acao"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Tipo de Ação *</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TIPOS_ACAO.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>{TIPO_ACAO_LABELS[tipo]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tribunal"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Tribunal</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: TJSP" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vara"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Vara</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: 1ª Vara Cível" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="comarca"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Comarca</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: São Paulo" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="area_juridica"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Área Jurídica</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Direito do Consumidor" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="fase_processual"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Fase Processual</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FASES_PROCESSUAIS.map(f => (
                      <SelectItem key={f} value={f}>{FASE_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="posicao"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Posição</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {POSICOES.map(p => (
                      <SelectItem key={p} value={p}>{POSICAO_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_PROCESSO.map(s => (
                      <SelectItem key={s} value={s}>{PROCESSO_STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valor_causa"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Valor da Causa (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={displayNumber(field.value)}
                    onChange={(e) => field.onChange(toNumber(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="data_distribuicao"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel>Data de Distribuição</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas sobre o processo..."
                  rows={3}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || loading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting || loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Processo'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default NovoProcessoForm;
