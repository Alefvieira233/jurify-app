
import React, { useEffect, useState } from 'react';
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
    const loadPermissions = async () => {
      const [
        leads,
        agendamentos,
        contratos,
        whatsappIa,
        usuarios,
      ] = await Promise.all([
        hasPermission('leads', 'write'),
        hasPermission('agendamentos', 'write'),
        hasPermission('contratos', 'write'),
        hasPermission('whatsapp_ia', 'write'),
        hasPermission('usuarios', 'write'),
      ]);

      setPermissions({
        leads,
        agendamentos,
        contratos,
        whatsapp_ia: whatsappIa,
        usuarios,
      });
    };

    void loadPermissions();
  }, [hasPermission]);

  const actions = [
    {
      title: 'Novo Lead',
      icon: UserPlus,
      onClick: onNewLead,
      permission: permissions.leads,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Novo Agendamento',
      icon: CalendarPlus,
      onClick: onNewAppointment,
      permission: permissions.agendamentos,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'Novo Contrato',
      icon: FileText,
      onClick: onNewContract,
      permission: permissions.contratos,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      title: 'Novo Agente IA',
      icon: MessageSquarePlus,
      onClick: onNewAgent,
      permission: permissions.whatsapp_ia,
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      title: 'Novo Usuário',
      icon: PlusCircle,
      onClick: onNewUser,
      permission: permissions.usuarios,
      color: 'bg-red-500 hover:bg-red-600'
    }
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
            return (
              <Button
                key={action.title}
                onClick={action.onClick}
                className={`${action.color} text-white p-4 h-auto flex flex-col items-center space-y-2`}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm font-medium">{action.title}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
