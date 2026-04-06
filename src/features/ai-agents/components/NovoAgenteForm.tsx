/**
 * 🤖 NOVO AGENTE FORM - REFATORADO
 * 
 * Formulário para criação e edição de agentes IA.
 * REFATORADO: Componentes quebrados em subcomponentes menores para melhor manutenção.
 * @see src/features/ai-agents/components/agente-form/
 */

import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { validateAgenteIA } from '@/schemas/agenteSchema';
import { sanitizeText } from '@/utils/validation';
import { AgentType } from '@/lib/multiagents/types';
import type { AgenteIA } from '@/hooks/useAgentesIA';

// Subcomponentes refatorados
import {
  BasicInfoSection,
  AIConfigSection,
  AdvancedParamsSection,
  InteractionConfigSection
} from './agente-form';
import { createLogger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';

const log = createLogger('NovoAgenteForm');

interface NovoAgenteFormProps {
  agente?: AgenteIA | null;
  defaultType?: AgentType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
}

const NovoAgenteForm: React.FC<NovoAgenteFormProps> = ({ agente, defaultType, open, onOpenChange, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  // Draft key: different for create vs edit to avoid cross-contamination
  const draftKey = agente ? `edit-agente-${agente.id}` : 'novo-agente';

  const [formData, setFormData, clearDraft] = useDraftPersistence(draftKey, {
    nome: '',
    area_juridica: '',
    objetivo: '',
    script_saudacao: '',
    perguntas_qualificacao: [''],
    keywords_acao: [''],
    delay_resposta: 3,
    status: 'ativo' as string,
    descricao_funcao: '',
    prompt_base: '',
    tipo_agente: (defaultType as string) || 'chat_interno',
    parametros_avancados: {
      temperatura: 0.7,
      top_p: 0.9,
      frequency_penalty: 0,
      presence_penalty: 0,
      modelo: 'gpt-4o-mini',
      max_tokens: 1500
    }
  });

  // Draft is preserved in sessionStorage via useDraftPersistence.
  // Clearing happens only on successful save (clearDraft) or explicit user cancel/close.

  useEffect(() => {
    if (agente) {
      const parametros = (agente.parametros_avancados ?? {}) as Record<string, unknown>;
      const getNumber = (value: unknown, fallback: number) =>
        typeof value === 'number' ? value : fallback;
      const getString = (value: unknown, fallback: string) =>
        typeof value === 'string' ? value : fallback;

      setFormData({
        nome: agente.nome ?? '',
        area_juridica: agente.area_juridica ?? '',
        objetivo: agente.objetivo ?? '',
        script_saudacao: agente.script_saudacao ?? '',
        perguntas_qualificacao: Array.isArray(agente.perguntas_qualificacao) && agente.perguntas_qualificacao.length > 0
          ? agente.perguntas_qualificacao
          : [''],
        keywords_acao: Array.isArray(agente.keywords_acao) && agente.keywords_acao.length > 0
          ? agente.keywords_acao
          : [''],
        delay_resposta: agente.delay_resposta ?? 3,
        status: agente.status ?? 'ativo',
        descricao_funcao: agente.descricao_funcao ?? '',
        prompt_base: agente.prompt_base ?? '',
        tipo_agente: agente.tipo_agente ?? 'chat_interno',
        parametros_avancados: {
          temperatura: getNumber(parametros.temperatura, 0.7),
          top_p: getNumber(parametros.top_p, 0.9),
          frequency_penalty: getNumber(parametros.frequency_penalty, 0),
          presence_penalty: getNumber(parametros.presence_penalty, 0),
          modelo: getString(parametros.modelo, 'gpt-4o-mini'),
          max_tokens: getNumber(parametros.max_tokens, 1500),
        }
      });
    }
  }, [agente, setFormData]);


  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleParametroChange = (field: keyof typeof formData.parametros_avancados, value: number | string) => {
    setFormData(prev => ({
      ...prev,
      parametros_avancados: {
        ...prev.parametros_avancados,
        [field]: value
      }
    }));
  };

  const handleArrayChange = (field: 'perguntas_qualificacao' | 'keywords_acao', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: 'perguntas_qualificacao' | 'keywords_acao') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: 'perguntas_qualificacao' | 'keywords_acao', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const dataToValidate = {
      ...formData,
      perguntas_qualificacao: formData.perguntas_qualificacao.filter(p => p.trim() !== ''),
      keywords_acao: formData.keywords_acao.filter(k => k.trim() !== '')
    };

    const validation = validateAgenteIA(dataToValidate);

    if (!validation.success && validation.errors.length > 0) {
      const firstError = validation.errors[0] ?? { field: 'unknown', message: 'Erro desconhecido' };
      toast({
        title: "Erro de Validação",
        description: `${firstError.field}: ${firstError.message}`,
        variant: "destructive",
      });
      return false;
    }

    return validation.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validatedData = validateForm();
    if (!validatedData) return;

    setLoading(true);

    try {
      const sanitizedData = {
        ...validatedData,
        nome: sanitizeText(validatedData.nome),
        descricao_funcao: sanitizeText(validatedData.descricao_funcao),
        prompt_base: sanitizeText(validatedData.prompt_base),
        script_saudacao: sanitizeText(validatedData.script_saudacao || ''),
        objetivo: sanitizeText(validatedData.objetivo || '')
      };

      if (agente) {
        if (!tenantId) throw new Error('Tenant não encontrado');
        const { error } = await supabase
          .from('agentes_ia')
          .update(sanitizedData)
          .eq('id', agente.id)
          .eq('tenant_id', tenantId);

        if (error) throw error;

        toast({
          title: "Agente Atualizado",
          description: "As configurações do agente foram atualizadas com sucesso",
        });
      } else {
        const { error } = await supabase
          .from('agentes_ia')
          .insert([sanitizedData]);

        if (error) throw error;

        toast({
          title: "Agente Criado",
          description: "Novo agente IA foi criado com sucesso",
        });
      }

      clearDraft();
      onClose();
    } catch (error) {
      log.error('Erro ao salvar agente', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o agente. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    clearDraft();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); onOpenChange(v); }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-xl">
              {agente ? 'Editar Agente IA' : 'Novo Agente IA'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => { void handleSubmit(event); }} className="p-6 space-y-6">
          <BasicInfoSection
            formData={formData}
            onInputChange={handleFieldChange}
          />

          <AIConfigSection
            formData={formData}
            onInputChange={handleFieldChange}
          />

          <AdvancedParamsSection
            parametros={formData.parametros_avancados}
            onParametroChange={handleParametroChange}
          />

          <InteractionConfigSection
            formData={formData}
            onInputChange={(field, value) => handleFieldChange(field, value)}
            onArrayChange={handleArrayChange}
            onAddArrayItem={addArrayItem}
            onRemoveArrayItem={removeArrayItem}
          />

          <div className="flex justify-end space-x-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Salvando...' : agente ? 'Atualizar Agente' : 'Criar Agente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoAgenteForm;
