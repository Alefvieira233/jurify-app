import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLeads } from '@/hooks/useLeads';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageCircle, CheckSquare, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  usePageTitle('Home');
  const { profile } = useAuth();
  const { leads } = useLeads();
  const navigate = useNavigate();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const leadsHoje = leads?.filter(l => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    return l.created_at?.startsWith(today);
  }).length ?? 0;

  const totalLeads = leads?.length ?? 0;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          {greeting()}, {profile?.nome_completo?.split(' ')[0] || 'Usuário'}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Aqui está o resumo do seu dia.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Leads hoje', value: leadsHoje, color: 'text-blue-600' },
          { label: 'Total de leads', value: totalLeads, color: 'text-green-600' },
          { label: 'Tarefas pendentes', value: '\u2014', color: 'text-amber-600' },
          { label: 'Agendamentos', value: '\u2014', color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="border border-border rounded-lg p-4 bg-card">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={() => navigate('/crm')}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Lead
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/whatsapp')}>
            <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Nova Conversa
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/agendamentos')}>
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" /> Nova Tarefa
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/agendamentos')}>
            <Calendar className="h-3.5 w-3.5 mr-1.5" /> Agendar
          </Button>
        </div>
      </div>
    </div>
  );
}
