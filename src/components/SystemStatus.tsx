import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, XCircle, Database, Server, Wifi } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SystemStatusState {
  database: 'online' | 'offline' | 'checking';
  auth: 'online' | 'offline' | 'checking';
  realtime: 'online' | 'offline' | 'checking';
}

const SystemStatus = () => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const [status, setStatus] = useState<SystemStatusState>({
    database: 'checking',
    auth: 'checking',
    realtime: 'checking'
  });

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 60000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const checkSystemStatus = async () => {
    try {
      const query = supabase.from('profiles').select('id').limit(1);
      const { error } = tenantId ? await query.eq('tenant_id', tenantId) : await query;
      setStatus(prev => ({ ...prev, database: error ? 'offline' : 'online' }));
    } catch {
      setStatus(prev => ({ ...prev, database: 'offline' }));
    }

    try {
      await supabase.auth.getSession();
      setStatus(prev => ({ ...prev, auth: 'online' }));
    } catch {
      setStatus(prev => ({ ...prev, auth: 'offline' }));
    }

    setStatus(prev => ({ ...prev, realtime: 'online' }));
  };

  const getStatusIcon = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-emerald-200" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-300" />;
      default:
        return <AlertCircle className="h-4 w-4 text-amber-300 animate-pulse" />;
    }
  };

  const getStatusBadge = (serviceStatus: string) => {
    switch (serviceStatus) {
      case 'online':
        return <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30">Online</Badge>;
      case 'offline':
        return <Badge className="bg-red-500/15 text-red-200 border border-red-400/30">Offline</Badge>;
      default:
        return <Badge className="bg-amber-500/15 text-amber-200 border border-amber-400/30">Verificando</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Status do Sistema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm">Base de Dados</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.database)}
            {getStatusBadge(status.database)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Server className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm">Autenticacao</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.auth)}
            {getStatusBadge(status.auth)}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <span className="text-sm">Tempo Real</span>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status.realtime)}
            {getStatusBadge(status.realtime)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatus;
