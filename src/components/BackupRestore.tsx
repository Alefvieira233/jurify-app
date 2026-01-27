import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const BackupRestore = () => {
  const [loading, setLoading] = useState(false);
  const [backupData, setBackupData] = useState('');
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  const BACKUP_TABLES = [
    'system_settings',
    'notification_templates',
    'agentes_ia',
    'api_keys',
    'google_calendar_settings',
    'configuracoes_integracoes'
  ];

  const exportConfigurations = async () => {
    if (!user || !tenantId) {
      toast({
        title: 'Acesso negado',
        description: 'Voce precisa estar logado para exportar configuracoes.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const backupObj: any = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        data: {}
      };

      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase
          .from(table as any)
          .select('*')
          .eq('tenant_id', tenantId);

        if (error) {
          console.error(`Erro ao exportar ${table}:`, error);
          continue;
        }

        if (table === 'system_settings') {
          backupObj.data[table] = data?.filter((item: any) => !item.is_sensitive) || [];
        } else {
          backupObj.data[table] = data || [];
        }
      }

      const jsonString = JSON.stringify(backupObj, null, 2);
      setBackupData(jsonString);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jurify-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup criado',
        description: 'Configuracoes exportadas com sucesso.'
      });
    } catch (error) {
      console.error('Erro no backup:', error);
      toast({
        title: 'Erro no backup',
        description: 'Falha ao exportar configuracoes.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const importConfigurations = async () => {
    if (!user || !tenantId) {
      toast({
        title: 'Acesso negado',
        description: 'Voce precisa estar logado para importar configuracoes.',
        variant: 'destructive'
      });
      return;
    }

    if (!backupData.trim()) {
      toast({
        title: 'Dados invalidos',
        description: 'Por favor, cole o JSON de backup.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const parsedData = JSON.parse(backupData);

      if (!parsedData.data) {
        throw new Error('Formato de backup invalido');
      }

      const confirmed = window.confirm(
        'ATENCAO: Esta acao vai sobrescrever as configuracoes atuais. Tem certeza?'
      );

      if (!confirmed) {
        setLoading(false);
        return;
      }

      for (const table of BACKUP_TABLES) {
        if (parsedData.data[table] && Array.isArray(parsedData.data[table])) {
          if (table !== 'api_keys') {
            await supabase
              .from(table as any)
              .delete()
              .eq('tenant_id', tenantId)
              .neq('id', '00000000-0000-0000-0000-000000000000');
          }

          const payload = parsedData.data[table].map((item: any) => ({
            ...item,
            tenant_id: tenantId
          }));

          const { error } = await supabase
            .from(table as any)
            .insert(payload);

          if (error) {
            console.error(`Erro ao importar ${table}:`, error);
          }
        }
      }

      toast({
        title: 'Importacao concluida',
        description: 'Configuracoes restauradas com sucesso.'
      });

      setBackupData('');
    } catch (error) {
      console.error('Erro na importacao:', error);
      toast({
        title: 'Erro na importacao',
        description: 'Falha ao importar configuracoes. Verifique o JSON.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Configuracoes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Exporte todas as configuracoes do sistema para backup.
          </p>
          <Button
            onClick={exportConfigurations}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Exportando...' : 'Criar Backup'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Configuracoes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-data">JSON de Backup</Label>
            <Textarea
              id="backup-data"
              placeholder="Cole aqui o JSON de backup..."
              value={backupData}
              onChange={(e) => setBackupData(e.target.value)}
              rows={10}
            />
          </div>

          <Button
            onClick={importConfigurations}
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Importando...' : 'Restaurar Backup'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupRestore;