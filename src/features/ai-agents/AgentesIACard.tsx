import React from 'react';
import { Bot, BarChart, Zap, Edit, Eye, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { AgenteIA } from '@/hooks/useAgentesIA';

interface AgentesIACardProps {
  agente: AgenteIA;
  onEdit: (agente: AgenteIA) => void;
  onViewDetails: (agente: AgenteIA) => void;
  onToggleStatus: (agente: AgenteIA) => void;
}

const tiposAgente = {
  chat_interno: { label: 'Chat Interno', icon: Bot, color: 'text-blue-300' },
  analise_dados: { label: 'Analise de Dados', icon: BarChart, color: 'text-emerald-200' },
  api_externa: { label: 'API Externa', icon: Zap, color: 'text-purple-200' }
};

export const AgentesIACard: React.FC<AgentesIACardProps> = ({
  agente,
  onEdit,
  onViewDetails,
  onToggleStatus
}) => {
  const tipoInfo = tiposAgente[agente.tipo_agente as keyof typeof tiposAgente] || tiposAgente.chat_interno;
  const TipoIcon = tipoInfo.icon;

  return (
    <Card className="card-hover border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:shadow-premium transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-[hsl(var(--muted))] border border-[hsl(var(--border))] ${tipoInfo.color}`}>
              <TipoIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] truncate">
                {agente.nome}
              </h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {tipoInfo.label}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant={(agente.status === 'ativo') ? 'default' : 'secondary'}
              className={(agente.status === 'ativo') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-[hsl(var(--muted-foreground))]'}
            >
              {(agente.status === 'ativo') ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>

        <div className="mb-4">
          <Badge variant="outline" className="bg-blue-500/15 text-blue-200 border border-blue-400/30 mb-2">
            {agente.area_juridica}
          </Badge>
          <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
            {agente.descricao_funcao || agente.objetivo}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))] mb-4">
          <span>
            Atualizado: {new Date(agente.updated_at || '').toLocaleDateString('pt-BR')}
          </span>
          <span className="text-[hsl(var(--accent))] font-medium">
            0 execuções
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(agente)}
              className="hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--accent))]"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(agente)}
              className="hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--accent))]"
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(agente)}
            className={(agente.status === 'ativo') ? 'hover:bg-red-500/10' : 'hover:bg-emerald-500/10'}
          >
            {(agente.status === 'ativo') ? (
              <>
                <PowerOff className="h-4 w-4 mr-1 text-red-300" />
                <span className="text-red-300">Desativar</span>
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-1 text-emerald-200" />
                <span className="text-emerald-200">Ativar</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};



