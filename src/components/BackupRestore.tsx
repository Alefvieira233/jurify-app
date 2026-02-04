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
  ] as const;

  type BackupTable = (typeof BACKUP_TABLES)[number];
  type BackupRecord = Record<string, unknown>;
  type BackupPayload = {
    version: string;
    exported_at: string;
    tenant_id: string;
    data: Record<BackupTable, BackupRecord[]>;
  };

  const isSensitiveSetting = (item: BackupRecord): boolean =>
    (item as { is_sensitive?: boolean }).is_sensitive === true;

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
      const backupObj: BackupPayload = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        tenant_id: tenantId,
        data: {
          system_settings: [],
          notification_templates: [],
          agentes_ia: [],
          api_keys: [],
          google_calendar_settings: [],
          configuracoes_integracoes: []
        }
      };

      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('tenant_id', tenantId);

        if (error) {
          console.error(`Erro ao exportar ${table}:`, error);
          continue;
        }

        if (table === 'system_settings') {
          backupObj.data[table] = (data as BackupRecord[] | null)?.filter((item) => !isSensitiveSetting(item)) || [];
        } else {
          backupObj.data[table] = (data as BackupRecord[] | null) || [];
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
      const parsedData = JSON.parse(backupData) as { data?: Record<string, BackupRecord[]> };

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
        const tableData = parsedData.data[table];
        if (tableData && Array.isArray(tableData)) {
          if (table !== 'api_keys') {
            await supabase
              .from(table)
              .delete()
              .eq('tenant_id', tenantId)
              .neq('id', '00000000-0000-0000-0000-000000000000');
          }

          const payload = tableData.map((item) => ({
            ...item,
            tenant_id: tenantId
          }));

          const { error } = await supabase
            .from(table)
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
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Exporte todas as configuracoes do sistema para backup.
          </p>
          <Button
            onClick={() => void exportConfigurations()}
            disabled={loading}
            className="w-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]"
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
            onClick={() => void importConfigurations()}
            disabled={loading}
            className="w-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]"
          >
            {loading ? 'Importando...' : 'Restaurar Backup'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupRestore;


