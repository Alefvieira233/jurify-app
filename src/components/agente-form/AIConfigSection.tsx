/**
 * 🤖 AI CONFIG SECTION - NovoAgenteForm Subcomponent
 * 
 * Seção de configuração de IA (prompt base e objetivo).
 */

import React from 'react';
import { Code } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AIConfigSectionProps {
  formData: {
    prompt_base: string;
    objetivo: string;
  };
  onInputChange: (field: string, value: string) => void;
}

export const AIConfigSection: React.FC<AIConfigSectionProps> = ({
  formData,
  onInputChange
}) => {
  return (
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
            onChange={(e) => onInputChange('prompt_base', e.target.value)}
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
            onChange={(e) => onInputChange('objetivo', e.target.value)}
            placeholder="Ex: Captar leads e qualificar casos trabalhistas"
          />
        </div>
      </CardContent>
    </Card>
  );
};
