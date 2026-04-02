import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Users, FileText, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { COLORS, tooltipStyle } from './useReportMetrics';

/* ─── Empty chart placeholder ─── */

const EmptyChart = ({ message = 'Sem dados para o período' }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
    <h3 className="text-lg font-medium text-foreground mb-2">{message}</h3>
    <p className="text-sm text-muted-foreground">Aguarde os primeiros registros serem criados</p>
  </div>
);

/* ─── Types ─── */

interface KpiMetrics {
  totalLeads: number;
  leadsNovoMes: number;
  contratos: number;
  contratosAssinados: number;
  agendamentos: number;
  agendamentosHoje: number;
  agentesAtivos: number;
  execucoesAgentesHoje: number;
  leadsPorStatus: Record<string, number>;
  execucoesRecentesAgentes: Array<{ total_execucoes: number }>;
}

interface ReportChartPanelProps {
  metrics: KpiMetrics;
  statusData: Array<{ name: string; value: number }>;
  areaData: Array<{ name: string; leads: number }>;
  agentesData: Array<{ name: string; execucoes: number; sucesso: number; erro: number }>;
  origemData: Array<{ name: string; value: number }>;
  agendamentosPorAreaData: Array<{ name: string; value: number }>;
}

/* ─── Component ─── */

const ReportChartPanel = ({
  metrics,
  statusData,
  areaData,
  agentesData,
  origemData,
  agendamentosPorAreaData,
}: ReportChartPanelProps) => {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden shadow-sm flex items-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-[14px] bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner z-10 shrink-0">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <div className="ml-4 z-10 flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Total de Leads</p>
            <p className="text-2xl font-black text-foreground leading-none mb-1">{metrics.totalLeads}</p>
            <p className="text-[10px] font-bold text-emerald-500">+{metrics.leadsNovoMes} cadastrados este mês</p>
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden shadow-sm flex items-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-[14px] bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner z-10 shrink-0">
            <FileText className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="ml-4 z-10 flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Contratos Gerados</p>
            <p className="text-2xl font-black text-foreground leading-none mb-1">{metrics.contratos}</p>
            <p className="text-[10px] font-bold text-emerald-500">{metrics.contratosAssinados} contratos concluídos/assinados</p>
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden shadow-sm flex items-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-[14px] bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner z-10 shrink-0">
            <Calendar className="h-6 w-6 text-purple-500" />
          </div>
          <div className="ml-4 z-10 flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Agendamentos</p>
            <p className="text-2xl font-black text-foreground leading-none mb-1">{metrics.agendamentos}</p>
            <p className="text-[10px] font-bold text-purple-400">{metrics.agendamentosHoje} reunião/tarefa para hoje</p>
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[20px] p-5 relative overflow-hidden shadow-sm flex items-center">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-[14px] bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner z-10 shrink-0">
            <TrendingUp className="h-6 w-6 text-amber-500" />
          </div>
          <div className="ml-4 z-10 flex-1 min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Inteligência Artificial</p>
            <p className="text-2xl font-black text-foreground leading-none mb-1">{metrics.agentesAtivos}</p>
            <p className="text-[10px] font-bold text-amber-500">{metrics.execucoesAgentesHoje} automações executadas hoje</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-background border border-border/10 rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/5">
            <h3 className="text-base font-bold">Pipeline de Leads</h3>
          </div>
          <div className="p-6">
            {statusData.length === 0 ? (
              <EmptyChart message="Sem dados para o período" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80} fill="#8884d8" dataKey="value"
                  >
                    {statusData.map((_e, i) => <Cell key={`status-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/5">
            <h3 className="text-base font-bold">Leads por Área Jurídica</h3>
          </div>
          <div className="p-6">
            {areaData.length === 0 ? (
              <EmptyChart message="Sem dados para o período" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={areaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="leads" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/5">
            <h3 className="text-base font-bold">Performance dos Agentes IA</h3>
          </div>
          <div className="p-6">
            {agentesData.length === 0 ? (
              <EmptyChart message="Sem dados de agentes" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={agentesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="sucesso" stackId="a" fill="#059669" name="Sucesso" />
                  <Bar dataKey="erro" stackId="a" fill="#e11d48" name="Erro" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[24px] overflow-hidden shadow-sm flex flex-col justify-center">
          <div className="px-6 py-4 border-b border-border/5">
            <h3 className="text-base font-bold">Resumo Estratégico</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/10 border border-border/10 rounded-[16px] hover:bg-muted/20 transition-colors">
              <span className="text-sm font-bold text-foreground">Taxa de Conversão</span>
              <Badge variant="secondary" className="px-3 py-1 font-bold">
                {metrics.totalLeads > 0 ? `${Math.min((metrics.contratosAssinados / metrics.totalLeads) * 100, 100).toFixed(1)}%` : '0%'}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/10 border border-border/10 rounded-[16px] hover:bg-muted/20 transition-colors">
              <span className="text-sm font-bold text-foreground">Leads Ativos (Quente)</span>
              <Badge variant="secondary" className="px-3 py-1 font-bold text-emerald-500">
                {(metrics.leadsPorStatus.qualificado ?? 0) + (metrics.leadsPorStatus.proposta ?? 0)}
              </Badge>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/10 border border-border/10 rounded-[16px] hover:bg-muted/20 transition-colors">
              <span className="text-sm font-bold text-foreground">Agendamentos Pendentes</span>
              <Badge variant="secondary" className="px-3 py-1 font-bold text-purple-500">{metrics.agendamentos}</Badge>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/10 border border-border/10 rounded-[16px] hover:bg-muted/20 transition-colors">
              <span className="text-sm font-bold text-foreground">Interações Processadas por IA</span>
              <Badge variant="secondary" className="px-3 py-1 font-bold text-amber-500">
                {metrics.execucoesRecentesAgentes.reduce((acc, a) => acc + a.total_execucoes, 0)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Origem + Agendamentos por Área */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-background border border-border/10 rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/5">
            <h3 className="text-base font-bold">Canais de Captação (Origem)</h3>
          </div>
          <div className="p-6">
            {origemData.length === 0 ? (
              <EmptyChart message="Sem dados de origem" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={origemData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[0, 4, 4, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-background border border-border/10 rounded-[24px] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/5">
            <h3 className="text-base font-bold">Agendamentos por Área Jurídica</h3>
          </div>
          <div className="p-6">
            {agendamentosPorAreaData.length === 0 ? (
              <EmptyChart message="Sem dados de agendamentos" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={agendamentosPorAreaData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {agendamentosPorAreaData.map((_e, i) => (
                      <Cell key={`ag-area-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { EmptyChart };
export default ReportChartPanel;
