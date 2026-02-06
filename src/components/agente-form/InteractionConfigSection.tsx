/**
 * 💬 INTERACTION CONFIG SECTION - NovoAgenteForm Subcomponent
 * 
 * Seção de configuração de interação (saudação, perguntas, keywords).
 */

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface InteractionConfigSectionProps {
  formData: {
    script_saudacao: string;
    perguntas_qualificacao: string[];
    keywords_acao: string[];
  };
  onInputChange: (field: 'script_saudacao', value: string) => void;
  onArrayChange: (field: 'perguntas_qualificacao' | 'keywords_acao', index: number, value: string) => void;
  onAddArrayItem: (field: 'perguntas_qualificacao' | 'keywords_acao') => void;
  onRemoveArrayItem: (field: 'perguntas_qualificacao' | 'keywords_acao', index: number) => void;
}

export const InteractionConfigSection: React.FC<InteractionConfigSectionProps> = ({
  formData,
  onInputChange,
  onArrayChange,
  onAddArrayItem,
  onRemoveArrayItem
}) => {
  return (
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
            onChange={(e) => onInputChange('script_saudacao', e.target.value)}
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
              onClick={() => onAddArrayItem('perguntas_qualificacao')}
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
                  onChange={(e) => onArrayChange('perguntas_qualificacao', index, e.target.value)}
                  placeholder={`Pergunta ${index + 1}`}
                />
                {formData.perguntas_qualificacao.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveArrayItem('perguntas_qualificacao', index)}
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
              onClick={() => onAddArrayItem('keywords_acao')}
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
                  onChange={(e) => onArrayChange('keywords_acao', index, e.target.value)}
                  placeholder={`Keyword ${index + 1}`}
                />
                {formData.keywords_acao.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveArrayItem('keywords_acao', index)}
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
  );
};
