import React, { useState, useEffect } from 'react';
import { X, Bot, Plus, Trash2, Settings, Code, BarChart, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { validateAgenteIA } from '@/schemas/agenteSchema';
import { sanitizeText } from '@/utils/validation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AgentType } from '@/lib/agents-legacy/AgentEngine';
import type { AgenteIA } from '@/hooks/useAgentesIA';

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

  const areas = [
    'Direito Trabalhista',
    'Direito de Familia',
    'Direito Civil',
    'Direito Previdenciario',
    'Direito Criminal',
    'Direito Empresarial'
  ];

  const tiposAgente = [
    {
      value: 'chat_interno',
      label: 'Chat Interno',
      description: 'Agente para interacao direta com clientes via chat',
      icon: Bot
    },
    {
      value: 'analise_dados',
      label: 'Analise de Dados',
      description: 'Agente especializado em analise e processamento de dados',
      icon: BarChart
    },
    {
      value: 'api_externa',
      label: 'API Externa',
      description: 'Agente para integracao com APIs e servicos externos',
      icon: Zap
    }
  ];

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

  const handleInputChange = <K extends keyof typeof formData>(field: K, value: (typeof formData)[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
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
    // Filtrar arrays vazios antes da validação
    const dataToValidate = {
      ...formData,
      perguntas_qualificacao: formData.perguntas_qualificacao.filter(p => p.trim() !== ''),
      keywords_acao: formData.keywords_acao.filter(k => k.trim() !== '')
    };

    const validation = validateAgenteIA(dataToValidate);

    if (!validation.success && validation.errors.length > 0) {
      const firstError = validation.errors[0];
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
      // Dados ja foram validados e sanitizados pelo Zod
      const sanitizedData = {
        ...validatedData,
        // Sanitizar campos de texto criticos
        nome: sanitizeText(validatedData.nome),
        descricao_funcao: sanitizeText(validatedData.descricao_funcao),
        prompt_base: sanitizeText(validatedData.prompt_base),
        script_saudacao: sanitizeText(validatedData.script_saudacao || ''),
        objetivo: sanitizeText(validatedData.objetivo || '')
      };
      if (agente) {
        // Atualizar agente existente
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
        // Criar novo agente
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
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {agente ? 'Editar Agente IA' : 'Novo Agente IA'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(event) => { void handleSubmit(event); }} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Informações Básicas</span>
              </CardTitle>
              <CardDescription>
                Configure as informações principais do agente IA
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome do Agente */}
              <div className="md:col-span-2">
                <Label htmlFor="nome">Nome do Agente *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Ex: Sofia - Especialista Trabalhista"
                  required
                />
              </div>

              {/* Descrição/Função */}
              <div className="md:col-span-2">
                <Label htmlFor="descricao_funcao">Descrição / Função *</Label>
                <Textarea
                  id="descricao_funcao"
                  value={formData.descricao_funcao}
                  onChange={(e) => handleInputChange('descricao_funcao', e.target.value)}
                  placeholder="Descreva o objetivo e a atuação do agente..."
                  rows={3}
                  required
                />
              </div>

              {/* Tipo de Agente */}
              <div>
                <Label htmlFor="tipo_agente">Tipo de Agente *</Label>
                <Select value={formData.tipo_agente} onValueChange={(value) => handleInputChange('tipo_agente', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAgente.map(tipo => {
                      const Icon = tipo.icon;
                      return (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{tipo.label}</div>
                              <div className="text-xs text-gray-500">{tipo.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Área Jurídica */}
              <div>
                <Label htmlFor="area_juridica">Área Jurídica *</Label>
                <Select value={formData.area_juridica} onValueChange={(value) => handleInputChange('area_juridica', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map(area => (
                      <SelectItem key={area} value={area}>{area}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delay de Resposta */}
              <div>
                <Label htmlFor="delay_resposta">Delay de Resposta (segundos)</Label>
                <Input
                  id="delay_resposta"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.delay_resposta}
                  onChange={(e) => handleInputChange('delay_resposta', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Prompt Base */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Code className="h-5 w-5" />
                <span>Configuração de IA</span>
              </CardTitle>
              <CardDescription>
                Configure o comportamento e as instruções do agente IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt Base */}
              <div>
                <Label htmlFor="prompt_base">Prompt Base (Instruções do Agente) *</Label>
                <Textarea
                  id="prompt_base"
                  value={formData.prompt_base}
                  onChange={(e) => handleInputChange('prompt_base', e.target.value)}
                  placeholder="Insira as instruções detalhadas que vão orientar o comportamento do agente IA..."
                  rows={8}
                  required
                  className="font-mono text-sm"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Este prompt será usado como base para todas as interações do agente
                </div>
              </div>

              {/* Objetivo (mantido para compatibilidade) */}
              <div>
                <Label htmlFor="objetivo">Objetivo Resumido</Label>
                <Input
                  id="objetivo"
                  value={formData.objetivo}
                  onChange={(e) => handleInputChange('objetivo', e.target.value)}
                  placeholder="Ex: Captar leads e qualificar casos trabalhistas"
                />
              </div>
            </CardContent>
          </Card>

          {/* Parâmetros Avançados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Parâmetros Avançados</span>
              </CardTitle>
              <CardDescription>
                Configure os parâmetros de geração de texto da IA
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="temperatura">Temperatura (0.0 - 1.0)</Label>
                <Input
                  id="temperatura"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.parametros_avancados.temperatura}
                  onChange={(e) => handleParametroChange('temperatura', parseFloat(e.target.value))}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Controla a criatividade das respostas
                </div>
              </div>

              <div>
                <Label htmlFor="top_p">Top P (0.0 - 1.0)</Label>
                <Input
                  id="top_p"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.parametros_avancados.top_p}
                  onChange={(e) => handleParametroChange('top_p', parseFloat(e.target.value))}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Controla a diversidade do vocabulário
                </div>
              </div>

              <div>
                <Label htmlFor="frequency_penalty">Frequency Penalty (0.0 - 2.0)</Label>
                <Input
                  id="frequency_penalty"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.parametros_avancados.frequency_penalty}
                  onChange={(e) => handleParametroChange('frequency_penalty', parseFloat(e.target.value))}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Reduz repetição de palavras
                </div>
              </div>

              <div>
                <Label htmlFor="presence_penalty">Presence Penalty (0.0 - 2.0)</Label>
                <Input
                  id="presence_penalty"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.parametros_avancados.presence_penalty}
                  onChange={(e) => handleParametroChange('presence_penalty', parseFloat(e.target.value))}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Incentiva novos tópicos
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Chat (mantidas para compatibilidade) */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Interação</CardTitle>
              <CardDescription>
                Configure como o agente interage com os usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Script de Saudação */}
              <div>
                <Label htmlFor="script_saudacao">Script de Saudação</Label>
                <Textarea
                  id="script_saudacao"
                  value={formData.script_saudacao}
                  onChange={(e) => handleInputChange('script_saudacao', e.target.value)}
                  placeholder="Escreva a mensagem inicial que o agente enviará..."
                  rows={4}
                />
              </div>

              {/* Perguntas de Qualificação */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Perguntas de Qualificação</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('perguntas_qualificacao')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.perguntas_qualificacao.map((pergunta, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={pergunta}
                        onChange={(e) => handleArrayChange('perguntas_qualificacao', index, e.target.value)}
                        placeholder={`Pergunta ${index + 1}`}
                      />
                      {formData.perguntas_qualificacao.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem('perguntas_qualificacao', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords de Ação */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Keywords de Ação</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('keywords_acao')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.keywords_acao.map((keyword, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={keyword}
                        onChange={(e) => handleArrayChange('keywords_acao', index, e.target.value)}
                        placeholder={`Keyword ${index + 1}`}
                      />
                      {formData.keywords_acao.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem('keywords_acao', index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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



