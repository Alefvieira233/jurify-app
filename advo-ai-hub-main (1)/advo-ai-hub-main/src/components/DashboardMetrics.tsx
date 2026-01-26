
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  FileText,
  Calendar,
  Bot,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { useContratos } from '@/hooks/useContratos';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useAgentesIA } from '@/hooks/useAgentesIA';

const DashboardMetrics = () => {
  const { leads } = useLeads();
  const { contratos } = useContratos();
  const { agendamentos } = useAgendamentos();
  const { agentes } = useAgentesIA();

  // Métricas calculadas
  const totalLeads = leads.length;
  const leadsPorStatus = {
    novo_lead: leads.filter(l => l.status === 'novo_lead').length,
    em_contato: leads.filter(l => l.status === 'em_contato').length,
    qualificado: leads.filter(l => l.status === 'qualificado').length,
    convertido: leads.filter(l => l.status === 'convertido').length,
  };

  const totalContratos = contratos.length;
  const contratosPorStatus = {
    rascunho: contratos.filter(c => c.status === 'rascunho').length,
    aguardando_assinatura: contratos.filter(c => c.status === 'aguardando_assinatura').length,
    assinado: contratos.filter(c => c.status === 'assinado').length,
  };

  const agendamentosHoje = agendamentos.filter(a => {
    const hoje = new Date().toDateString();
    const dataAgendamento = new Date(a.data_hora).toDateString();
    return hoje === dataAgendamento;
  }).length;

  const agentesAtivos = agentes.filter(a => a.status === 'ativo').length;

  const taxaConversao = totalLeads > 0 ? (leadsPorStatus.convertido / totalLeads) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="card-monolith">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Total de Leads</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">{totalLeads}</div>
            <div className="flex items-center gap-2 mt-4">
              <div className="px-2 py-0.5 bg-green-500/10 text-green-500 text-[9px] font-bold">+{leadsPorStatus.novo_lead} NOVO</div>
              <span className="text-[9px] text-foreground/30 font-bold uppercase tracking-widest">ESTE MÊS</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-monolith">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Contratos</CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">{totalContratos}</div>
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-4">
              {contratosPorStatus.assinado} UNIDADES ASSINADAS
            </p>
          </CardContent>
        </Card>

        <Card className="card-monolith">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Agenda Focus</CardTitle>
            <Calendar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">{agendamentosHoje}</div>
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-4">
              REUNIÕES PARA HOJE
            </p>
          </CardContent>
        </Card>

        <Card className="card-monolith">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Agentes Ativos</CardTitle>
            <Bot className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">{agentesAtivos}</div>
            <p className="text-[10px] text-foreground/30 font-bold uppercase tracking-widest mt-4">
              IA EM EXECUÇÃO
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Taxa de Conversão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Taxa de Conversão
          </CardTitle>
          <CardDescription>
            Percentual de leads convertidos em clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conversão Geral</span>
              <span className="text-sm text-muted-foreground">{taxaConversao.toFixed(1)}%</span>
            </div>
            <Progress value={taxaConversao} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Pipeline de Leads */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline de Leads</CardTitle>
          <CardDescription>
            Distribuição dos leads por status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Novos</span>
              </div>
              <div className="text-2xl font-bold">{leadsPorStatus.novo_lead}</div>
              <Badge variant="secondary">Primeiro contato</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Em Contato</span>
              </div>
              <div className="text-2xl font-bold">{leadsPorStatus.em_contato}</div>
              <Badge variant="secondary">Negociação</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Qualificados</span>
              </div>
              <div className="text-2xl font-bold">{leadsPorStatus.qualificado}</div>
              <Badge variant="secondary">Prontos para fechar</Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Convertidos</span>
              </div>
              <div className="text-2xl font-bold">{leadsPorStatus.convertido}</div>
              <Badge variant="default">Clientes</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status dos Contratos */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Contratos</CardTitle>
          <CardDescription>
            Acompanhamento do processo de assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Rascunho</span>
              </div>
              <div className="text-xl font-bold">{contratosPorStatus.rascunho}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">Aguardando Assinatura</span>
              </div>
              <div className="text-xl font-bold">{contratosPorStatus.aguardando_assinatura}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Assinados</span>
              </div>
              <div className="text-xl font-bold">{contratosPorStatus.assinado}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardMetrics;
