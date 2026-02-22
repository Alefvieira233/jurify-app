/**
 * 🤖 NOVO AGENTE FORM - REFATORADO
 * 
 * Formulário para criação e edição de agentes IA.
 * REFATORADO: Componentes quebrados em subcomponentes menores para melhor manutenção.
 * @see src/components/agente-form/
 */

import React, { useState, useEffect } from 'react';
import { X, Bot } from 'lucide-react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
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
} from '@/components/agente-form';

interface NovoAgenteFormProps {
  agente?: AgenteIA | null;
  defaultType?: AgentType;
  onClose: () => void;
}

const NovoAgenteForm: React.FC<NovoAgenteFormProps> = ({ agente, defaultType, onClose }) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
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
      presence_penalty: 0
    }
  });

  useEffect(() => {
    if (agente) {
      const parametros = (agente.parametros_avancados ?? {}) as Record<string, unknown>;
      const getNumber = (value: unknown, fallback: number) =>
        typeof value === 'number' ? value : fallback;

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
        }
      });
    }
  }, [agente]);


  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleParametroChange = (field: keyof typeof formData.parametros_avancados, value: number) => {
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
        const { error } = await supabase
          .from('agentes_ia')
          .update(sanitizedData)
          .eq('id', agente.id);

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

      onClose();
    } catch (error) {
      console.error('Erro ao salvar agente:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o agente. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-foreground">
              {agente ? 'Editar Agente IA' : 'Novo Agente IA'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-muted-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(event) => { void handleSubmit(event); }} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <BasicInfoSection
            formData={formData}
            onInputChange={handleFieldChange}
          />

          {/* Configuração de IA */}
          <AIConfigSection
            formData={formData}
            onInputChange={handleFieldChange}
          />

          {/* Parâmetros Avançados */}
          <AdvancedParamsSection
            parametros={formData.parametros_avancados}
            onParametroChange={handleParametroChange}
          />

          {/* Configurações de Interação */}
          <InteractionConfigSection
            formData={formData}
            onInputChange={(field, value) => handleFieldChange(field, value)}
            onArrayChange={handleArrayChange}
            onAddArrayItem={addArrayItem}
            onRemoveArrayItem={removeArrayItem}
          />

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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
      </div>
    </div>
  );
};

export default NovoAgenteForm;
