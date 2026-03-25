import { useState } from 'react';
import { Users, MessageSquare, CheckCircle, Clock } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeads } from '@/hooks/useLeads';
import StatCard from './components/StatCard';
import RankingAgentesTable from '@/components/relatorios/RankingAgentesTable';

const Dashboard = () => {
  usePageTitle('Dashboard');
  const { leads } = useLeads();
  const [periodo, setPeriodo] = useState('mes');

  const totalLeads = leads?.length ?? 0;
  const leadsNovos = leads?.filter(l => l.status === 'novo').length ?? 0;
  const leadsGanhos = leads?.filter(l => l.status === 'ganho').length ?? 0;
  const leadsEmContato = leads?.filter(l => l.status === 'em_contato').length ?? 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu escritório</p>
        </div>
        <div className="flex items-center gap-2">
          {['semana', 'mes', 'trimestre'].map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                periodo === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Trimestre'}
            </button>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Leads"
          value={totalLeads}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Novos"
          value={leadsNovos}
          change={`${totalLeads > 0 ? Math.round((leadsNovos / totalLeads) * 100) : 0}% do total`}
          changeType="neutral"
          icon={<MessageSquare className="h-4 w-4" />}
        />
        <StatCard
          label="Em Contato"
          value={leadsEmContato}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Ganhos"
          value={leadsGanhos}
          change={`${totalLeads > 0 ? Math.round((leadsGanhos / totalLeads) * 100) : 0}% conversão`}
          changeType="positive"
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>

      {/* Pipeline overview */}
      <div className="border border-border rounded-lg p-5 bg-card">
        <h2 className="text-sm font-semibold text-foreground mb-4">Pipeline por Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { status: 'novo', label: 'Novo', color: 'bg-blue-500' },
            { status: 'em_contato', label: 'Em Contato', color: 'bg-cyan-500' },
            { status: 'qualificado', label: 'Qualificado', color: 'bg-amber-500' },
            { status: 'proposta', label: 'Proposta', color: 'bg-indigo-500' },
            { status: 'negociacao', label: 'Negociação', color: 'bg-purple-500' },
            { status: 'ganho', label: 'Ganho', color: 'bg-emerald-500' },
            { status: 'perdido', label: 'Perdido', color: 'bg-rose-500' },
          ].map(s => {
            const count = leads?.filter(l => l.status === s.status).length ?? 0;
            return (
              <div key={s.status} className="text-center">
                <div className={`h-1.5 rounded-full ${s.color} mb-2`} />
                <div className="text-lg font-bold text-foreground">{count}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ranking Agentes */}
      <div className="border border-border rounded-lg p-5 bg-card">
        <h2 className="text-sm font-semibold text-foreground mb-4">Ranking de Agentes</h2>
        <RankingAgentesTable periodo={periodo} />
      </div>
    </div>
  );
};

export default Dashboard;
