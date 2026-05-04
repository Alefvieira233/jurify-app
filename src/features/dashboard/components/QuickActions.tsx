
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, 
  CalendarPlus, 
  FileText, 
  MessageSquarePlus,
  PlusCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TrialGate from '@/components/TrialGate';
import type { TrialRestrictions } from '@/hooks/useSubscription';

interface QuickActionsProps {
  onNewLead?: () => void;
  onNewContract?: () => void;
  onNewAppointment?: () => void;
  onNewAgent?: () => void;
  onNewUser?: () => void;
}

const QuickActions = ({
  onNewLead,
  onNewContract,
  onNewAppointment,
  onNewAgent,
  onNewUser
}: QuickActionsProps) => {
  const { hasPermission } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPermissions({
      leads: hasPermission('leads', 'write'),
      agendamentos: hasPermission('agendamentos', 'write'),
      contratos: hasPermission('contratos', 'write'),
      whatsapp_ia: hasPermission('whatsapp_ia', 'write'),
      usuarios: hasPermission('usuarios', 'write'),
    });
  }, [hasPermission]);

  const actions: Array<{
    title: string;
    icon: typeof UserPlus;
    onClick: (() => void) | undefined;
    permission: boolean | undefined;
    color: string;
    trialAction?: keyof TrialRestrictions;
  }> = [
    {
      title: 'Novo Cliente',
      icon: UserPlus,
      onClick: onNewLead,
      permission: permissions.leads,
      color: 'bg-blue-500 hover:bg-blue-600',
      trialAction: 'create_lead',
    },
    {
      title: 'Novo Agendamento',
      icon: CalendarPlus,
      onClick: onNewAppointment,
      permission: permissions.agendamentos,
      color: 'bg-green-500 hover:bg-green-600',
      trialAction: 'create_agendamento',
    },
    {
      title: 'Novo Contrato',
      icon: FileText,
      onClick: onNewContract,
      permission: permissions.contratos,
      color: 'bg-purple-500 hover:bg-purple-600',
      trialAction: 'create_contrato',
    },
    {
      title: 'Novo Agente IA',
      icon: MessageSquarePlus,
      onClick: onNewAgent,
      permission: permissions.whatsapp_ia,
      color: 'bg-orange-500 hover:bg-orange-600',
    },
    {
      title: 'Novo Usuário',
      icon: PlusCircle,
      onClick: onNewUser,
      permission: permissions.usuarios,
      color: 'bg-red-500 hover:bg-red-600',
    },
  ];

  const availableActions = actions.filter(action => action.permission && action.onClick);

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableActions.map((action) => {
            const Icon = action.icon;
            const button = (
              <Button
                key={action.title}
                onClick={action.onClick}
                className={`${action.color} text-white p-4 h-auto flex flex-col items-center space-y-2 w-full`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{action.title}</span>
              </Button>
            );
            if (action.trialAction) {
              return (
                <TrialGate key={action.title} action={action.trialAction}>
                  {button}
                </TrialGate>
              );
            }
            return button;
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
