/**
 * ⚙️ ADVANCED PARAMS SECTION - NovoAgenteForm Subcomponent
 * 
 * Seção de parâmetros avançados de IA.
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AdvancedParamsSectionProps {
  parametros: {
    temperatura: number;
    top_p: number;
    frequency_penalty: number;
    presence_penalty: number;
  };
  onParametroChange: (field: keyof AdvancedParamsSectionProps['parametros'], value: number) => void;
}

export const AdvancedParamsSection: React.FC<AdvancedParamsSectionProps> = ({
  parametros,
  onParametroChange
}) => {
  return (
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
            value={parametros.temperatura}
            onChange={(e) => onParametroChange('temperatura', parseFloat(e.target.value))}
          />
          <div className="text-xs text-muted-foreground mt-1">
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
            value={parametros.top_p}
            onChange={(e) => onParametroChange('top_p', parseFloat(e.target.value))}
          />
          <div className="text-xs text-muted-foreground mt-1">
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
            value={parametros.frequency_penalty}
            onChange={(e) => onParametroChange('frequency_penalty', parseFloat(e.target.value))}
          />
          <div className="text-xs text-muted-foreground mt-1">
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
            value={parametros.presence_penalty}
            onChange={(e) => onParametroChange('presence_penalty', parseFloat(e.target.value))}
          />
          <div className="text-xs text-muted-foreground mt-1">
            Incentiva novos tópicos
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
