/**
 * 📝 BASIC INFO SECTION - NovoAgenteForm Subcomponent
 * 
 * Seção de informações básicas do agente.
 */

import React from 'react';
import { Settings, Bot, BarChart, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface BasicInfoSectionProps {
  formData: {
    nome: string;
    descricao_funcao: string;
    tipo_agente: string;
    area_juridica: string;
    status: string;
    delay_resposta: number;
  };
  onInputChange: (field: string, value: string | number) => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  onInputChange
}) => {
  return (
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
            onChange={(e) => onInputChange('nome', e.target.value)}
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
            onChange={(e) => onInputChange('descricao_funcao', e.target.value)}
            placeholder="Descreva o objetivo e a atuação do agente..."
            rows={3}
            required
          />
        </div>

        {/* Tipo de Agente */}
        <div>
          <Label htmlFor="tipo_agente">Tipo de Agente *</Label>
          <Select value={formData.tipo_agente} onValueChange={(value) => onInputChange('tipo_agente', value)}>
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
          <Select value={formData.area_juridica} onValueChange={(value) => onInputChange('area_juridica', value)}>
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
          <Select value={formData.status} onValueChange={(value) => onInputChange('status', value)}>
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
            onChange={(e) => onInputChange('delay_resposta', parseInt(e.target.value))}
          />
        </div>
      </CardContent>
    </Card>
  );
};
