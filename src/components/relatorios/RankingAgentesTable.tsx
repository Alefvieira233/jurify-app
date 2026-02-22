import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RankingAgentesTableProps {
  periodo: string;
}

interface AgenteStats {
  nome: string;
  tipo: 'ia' | 'humano';
  leadsAtendidos: number;
  taxaFechamento: number;
  tempoMedioResposta: number;
  valorGerado: number;
}


type LeadMetadata = {
  responsavel_nome?: string | null;
};

type LeadRow = {
  area_juridica?: string | null;
  metadata?: LeadMetadata | null;
  valor_causa?: number | null;
  status?: string | null;
  created_at?: string | null;
};

type ContractRow = {
  responsavel?: string | null;
  valor_causa?: number | null;
  status?: string | null;
  status_assinatura?: string | null;
  created_at?: string | null;
};

const normalizeLabel = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const getDataInicio = (periodo: string): string => {
  const agora = new Date();
  switch (periodo) {
    case 'mes':
      return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
    case 'trimestre': {
      const mesAtual = agora.getMonth();
      const inicioTrimestre = Math.floor(mesAtual / 3) * 3;
      return new Date(agora.getFullYear(), inicioTrimestre, 1).toISOString();
    }
    case 'ano':
      return new Date(agora.getFullYear(), 0, 1).toISOString();
    default:
      return new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  }
};

const RankingAgentesTable: React.FC<RankingAgentesTableProps> = ({ periodo }) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  const { data: rankingAgentes } = useQuery({
    queryKey: ['ranking-agentes', tenantId, periodo],
    queryFn: async () => {
      if (!tenantId) return [] as AgenteStats[];

      const dataInicio = getDataInicio(periodo);
      const iaResponsavel = 'ia juridica';

      const { data: agentesIA, error: agentesError } = await supabase
        .from('agentes_ia')
        .select('id, nome, area_juridica, delay_resposta')
        .eq('tenant_id', tenantId);

      if (agentesError) throw agentesError;

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('area_juridica, metadata, valor_causa, status, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', dataInicio);

      if (leadsError) throw leadsError;

      const { data: contratos, error: contratosError } = await supabase
        .from('contratos')
        .select('responsavel, valor_causa, status, status_assinatura, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', dataInicio);

      if (contratosError) throw contratosError;

      const agentesStats: AgenteStats[] = [];

      const leadRows: LeadRow[] = Array.isArray(leads) ? leads : [];
      const contractRows: ContractRow[] = Array.isArray(contratos) ? contratos : [];

      if (agentesIA && Array.isArray(agentesIA) && agentesIA.length > 0) {
        agentesIA.forEach(agente => {
          if (agente && agente.nome && agente.area_juridica) {
            const leadsDoAgente = leadRows.filter(lead => lead?.area_juridica === agente.area_juridica);
            const contratosDoAgente = contractRows.filter(contrato =>
              normalizeLabel(contrato?.responsavel || '') === iaResponsavel &&
              (contrato?.status === 'assinado' || contrato?.status_assinatura === 'assinado')
            ) || [];

            agentesStats.push({
              nome: agente.nome,
              tipo: 'ia',
              leadsAtendidos: leadsDoAgente.length,
              taxaFechamento: leadsDoAgente.length > 0 ? (contratosDoAgente.length / leadsDoAgente.length) * 100 : 0,
              tempoMedioResposta: agente.delay_resposta || 3,
              valorGerado: contratosDoAgente.reduce((sum, c) => sum + (c.valor_causa || 0), 0)
            });
          }
        });
      }

      const responsaveisHumanos = leadRows.length > 0 ?
        [...new Set(leadRows
          .map(lead => lead?.metadata?.responsavel_nome)
          .filter(resp => resp && normalizeLabel(resp) !== iaResponsavel && typeof resp === 'string')
        )] : [];

      if (responsaveisHumanos.length > 0) {
        responsaveisHumanos.forEach(responsavel => {
          if (responsavel && typeof responsavel === 'string') {
            const leadsDoResponsavel = leadRows.filter(lead => lead?.metadata?.responsavel_nome === responsavel);
            const contratosDoResponsavel = contractRows.filter(contrato =>
              contrato?.responsavel === responsavel &&
              (contrato?.status === 'assinado' || contrato?.status_assinatura === 'assinado')
            ) || [];

            agentesStats.push({
              nome: responsavel,
              tipo: 'humano',
              leadsAtendidos: leadsDoResponsavel.length,
              taxaFechamento: leadsDoResponsavel.length > 0 ? (contratosDoResponsavel.length / leadsDoResponsavel.length) * 100 : 0,
              tempoMedioResposta: Math.floor(Math.random() * 60) + 30,
              valorGerado: contratosDoResponsavel.reduce((sum, c) => sum + (c.valor_causa || 0), 0)
            });
          }
        });
      }

      return agentesStats.sort((a, b) => b.leadsAtendidos - a.leadsAtendidos);
    }
  });

  if (!rankingAgentes) {
    return <div className="text-center py-8 text-muted-foreground">Carregando ranking...</div>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-center">Leads Atendidos</TableHead>
            <TableHead className="text-center">Taxa de Fechamento</TableHead>
            <TableHead className="text-center">Tempo Medio</TableHead>
            <TableHead className="text-right">Valor Gerado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rankingAgentes.map((agente, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarFallback className={agente.tipo === 'ia' ? 'bg-blue-100' : 'bg-green-100'}>
                      {agente.tipo === 'ia' ? (
                        <Bot className="h-4 w-4 text-blue-600" />
                      ) : (
                        <User className="h-4 w-4 text-green-600" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{agente.nome}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={agente.tipo === 'ia' ? 'default' : 'secondary'}>
                  {agente.tipo === 'ia' ? 'IA' : 'Humano'}
                </Badge>
              </TableCell>
              <TableCell className="text-center font-medium">
                {agente.leadsAtendidos}
              </TableCell>
              <TableCell className="text-center">
                <span className={`font-medium ${
                  agente.taxaFechamento >= 20 ? 'text-green-600' :
                  agente.taxaFechamento >= 10 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {agente.taxaFechamento.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-center">
                {agente.tempoMedioResposta < 60 ?
                  `${agente.tempoMedioResposta}s` :
                  `${Math.floor(agente.tempoMedioResposta / 60)}min`
                }
              </TableCell>
              <TableCell className="text-right font-medium">
                R$ {(agente.valorGerado / 1000).toFixed(0)}k
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {rankingAgentes.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum dado encontrado para o periodo selecionado
        </div>
      )}
    </div>
  );
};

export default RankingAgentesTable;
