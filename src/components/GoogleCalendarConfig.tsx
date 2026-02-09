
import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Settings, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const GoogleCalendarConfig = () => {
  const { user } = useAuth();
  const {
    loading,
    settings,
    initializeGoogleAuth,
    loadSettings,
    updateSettings,
    disconnectGoogle
  } = useGoogleCalendar();
  
  const [isConnected, setIsConnected] = useState(false);
  type SyncLog = {
    id: string;
    status: string;
    action: string;
    created_at: string;
    error_message?: string | null;
  };
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const checkConnection = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('google_calendar_tokens')
      .select('id')
      .eq('user_id', user.id)
      .single();

    setIsConnected(!!data);
  }, [user?.id]);

  const loadSyncLogs = useCallback(async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('google_calendar_sync_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setSyncLogs((data as SyncLog[] | null) || []);
  }, [user?.id]);

  useEffect(() => {
    void loadSettings();
    void checkConnection();
    void loadSyncLogs();
  }, [loadSettings, checkConnection, loadSyncLogs]);

  const handleConnect = () => {
    void initializeGoogleAuth();
  };

  const handleDisconnect = async () => {
    await disconnectGoogle();
    setIsConnected(false);
  };

  const handleSettingChange = async (key: string, value: boolean | string) => {
    await updateSettings({ [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Integração Google Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Status da Conexão</p>
              <p className="text-sm text-gray-600">
                {isConnected 
                  ? 'Conectado com sua conta Google'
                  : 'Não conectado ao Google Calendar'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Conectado
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Desconectado
                  </>
                )}
              </Badge>
              {isConnected ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => void handleDisconnect()}
                  disabled={loading}
                >
                  Desconectar
                </Button>
              ) : (
                <Button 
                  onClick={handleConnect}
                  disabled={loading}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  Conectar Google
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configurações de Sincronização</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="calendar-enabled">Sincronização Automática</Label>
                <p className="text-sm text-gray-600">
                  Sincronizar automaticamente agendamentos com Google Calendar
                </p>
              </div>
              <Switch
                id="calendar-enabled"
                checked={settings?.calendar_enabled || false}
                    onCheckedChange={(checked) => void handleSettingChange('calendar_enabled', checked)}
              />
            </div>

            {settings?.calendar_enabled && (
              <>
                <div className="space-y-2">
                  <Label>Direção da Sincronização</Label>
                  <Select
                    value={settings.sync_direction ?? undefined}
                    onValueChange={(value) => void handleSettingChange('sync_direction', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jurify_to_google">
                        Jurify → Google Calendar
                      </SelectItem>
                      <SelectItem value="google_to_jurify">
                        Google Calendar → Jurify
                      </SelectItem>
                      <SelectItem value="bidirectional">
                        Bidirecional (Futuro)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Atualmente apenas Jurify → Google Calendar está disponível
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="notifications">Notificações</Label>
                    <p className="text-sm text-gray-600">
                      Receber notificações sobre sincronização
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={settings?.notification_enabled || false}
                    onCheckedChange={(checked) => void handleSettingChange('notification_enabled', checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Log de Sincronizações */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Histórico de Sincronizações</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {syncLogs.length > 0 ? (
              <div className="space-y-3">
                {syncLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                          {log.action}
                        </Badge>
                        <span className="text-sm font-medium">
                          {log.status === 'success' ? 'Sucesso' : 'Erro'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-600">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                Nenhuma sincronização realizada ainda
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoogleCalendarConfig;
