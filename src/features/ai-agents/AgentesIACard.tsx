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
  chat_interno: { label: 'Chat Interno', icon: Bot, color: 'text-blue-500' },
  analise_dados: { label: 'Analise de Dados', icon: BarChart, color: 'text-green-500' },
  api_externa: { label: 'API Externa', icon: Zap, color: 'text-purple-500' }
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
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg bg-gray-50 ${tipoInfo.color}`}>
              <TipoIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {agente.nome}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {tipoInfo.label}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant={(agente.status === 'ativo') ? 'default' : 'secondary'}
              className={(agente.status === 'ativo') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}
            >
              {(agente.status === 'ativo') ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>

        <div className="mb-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mb-2">
            {agente.area_juridica}
          </Badge>
          <p className="text-sm text-gray-600 line-clamp-2">
            {agente.descricao_funcao || agente.objetivo}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span>
            Atualizado: {new Date(agente.updated_at).toLocaleDateString('pt-BR')}
          </span>
          <span className="text-blue-600 font-medium">
            0 execucoes
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(agente)}
              className="hover:bg-blue-50"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(agente)}
              className="hover:bg-blue-50"
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(agente)}
            className={(agente.status === 'ativo') ? 'hover:bg-red-50' : 'hover:bg-green-50'}
          >
            {(agente.status === 'ativo') ? (
              <>
                <PowerOff className="h-4 w-4 mr-1 text-red-600" />
                <span className="text-red-600">Desativar</span>
              </>
            ) : (
              <>
                <Power className="h-4 w-4 mr-1 text-green-600" />
                <span className="text-green-600">Ativar</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};


