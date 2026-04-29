import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeads } from '@/hooks/useLeads';
import { useTarefas } from '@/hooks/useTarefas';
import { useAgendamentos } from '@/hooks/useAgendamentos';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, CheckSquare, Calendar, Users, ListTodo, CalendarCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard, PrazosUrgentesWidget } from '@/features/dashboard';
import ErrorState from '@/components/ErrorState';

export default function HomePage() {
  usePageTitle('Home');
  const { profile } = useAuth();
  const { leads, loading: leadsLoading, error: leadsError } = useLeads();
  const { tarefas, isLoading: tarefasLoading } = useTarefas();
  const { agendamentos, loading: agendamentosLoading, error: agendamentosError } = useAgendamentos();
  const navigate = useNavigate();

  const isLoading = leadsLoading || tarefasLoading || agendamentosLoading;
  const isError = !!(leadsError || agendamentosError);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = profile?.nome_completo?.split(' ')[0] || 'Usuario';

  const today = new Date().toISOString().split('T')[0] ?? '';

  const leadsHoje = leads?.filter(l => l.created_at?.startsWith(today)).length ?? 0;
  const totalLeads = leads?.length ?? 0;
  const tarefasPendentes = tarefas?.filter(t => t.status === 'pendente').length ?? 0;
  const agendamentosFuturos = agendamentos?.filter(a => {
    const dataHora = new Date(a.data_hora).getTime();
    return dataHora >= Date.now() - 24 * 60 * 60 * 1000;
  }).length ?? 0;

  if (isError) {
    return (
      <div className="h-[calc(100vh-var(--topbar-h,4rem))] flex items-center justify-center p-6">
        <ErrorState title="Erro ao carregar dados" onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {greeting()}, {firstName}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aqui está o resumo do seu dia.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatCard
              label="Leads hoje"
              value={leadsHoje}
              icon={<Users className="h-4 w-4" />}
              changeType="neutral"
            />
            <StatCard
              label="Total de leads"
              value={totalLeads}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              label="Tarefas pendentes"
              value={tarefasPendentes}
              icon={<ListTodo className="h-4 w-4" />}
            />
            <StatCard
              label="Agendamentos"
              value={agendamentosFuturos}
              icon={<CalendarCheck className="h-4 w-4" />}
            />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => navigate('/pipeline')}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Lead
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/whatsapp')}>
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Nova Conversa
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/tarefas')}>
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Nova Tarefa
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/agendamentos')}>
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Agendar
          </Button>
        </div>
      </div>

      {/* Prazos Urgentes */}
      <PrazosUrgentesWidget />
    </div>
  );
}
