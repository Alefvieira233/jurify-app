
import React, { useState } from 'react';
import { Bell, Check, CheckCheck, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const NotificationsPanel = () => {
  const [loading] = useState(false);
  const [notifications] = useState([
    {
      id: '1',
      titulo: 'Novo lead cadastrado',
      mensagem: 'João Silva foi cadastrado como novo lead para Direito Trabalhista',
      tipo: 'info',
      data_criacao: new Date().toISOString(),
      lido: false
    },
    {
      id: '2',
      titulo: 'Agendamento confirmado',
      mensagem: 'Reunião com Maria Santos confirmada para amanhã às 14:00',
      tipo: 'success',
      data_criacao: new Date(Date.now() - 3600000).toISOString(),
      lido: false
    },
    {
      id: '3',
      titulo: 'Contrato assinado',
      mensagem: 'Contrato de prestação de serviços foi assinado digitalmente',
      tipo: 'success',
      data_criacao: new Date(Date.now() - 7200000).toISOString(),
      lido: true
    }
  ]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCheck className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-100 border-green-200';
      case 'warning':
        return 'bg-yellow-100 border-yellow-200';
      case 'error':
        return 'bg-red-100 border-red-200';
      default:
        return 'bg-blue-100 border-blue-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Notificações</CardTitle>
                <p className="text-gray-600">Central de avisos e atualizações</p>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
        </Card>
        
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.lido).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bell className="h-8 w-8 text-blue-600" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1">
                    {unreadCount}
                  </Badge>
                )}
              </div>
              <div>
                <CardTitle className="text-2xl">Notificações</CardTitle>
                <p className="text-gray-600">
                  Central de avisos e atualizações • {unreadCount} não lidas
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              {unreadCount > 0 && (
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Check className="h-4 w-4 mr-2" />
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Notificações */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-8">
              <div className="text-center">
                <Bell className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-blue-900 mb-2">Nenhuma notificação</h3>
                <p className="text-blue-700">
                  Você está em dia! Não há notificações pendentes no momento.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`transition-all hover:shadow-md ${
                !notification.lido 
                  ? `${getTypeColor(notification.tipo)} border-l-4` 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {getTypeIcon(notification.tipo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`font-medium text-gray-900 ${!notification.lido ? 'font-semibold' : ''}`}>
                        {notification.titulo}
                      </h4>
                      <div className="flex items-center gap-2 shrink-0">
                        {!notification.lido && (
                          <Badge variant="secondary" className="text-xs">
                            Nova
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {notification.mensagem}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(notification.data_criacao).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Filtros e Ações */}
      {notifications.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                Todas ({notifications.length})
              </Button>
              <Button variant="outline" size="sm">
                Não lidas ({unreadCount})
              </Button>
              <Button variant="outline" size="sm">
                Lidas ({notifications.length - unreadCount})
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                Limpar lidas
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NotificationsPanel;
