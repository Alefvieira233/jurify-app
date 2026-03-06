import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Download, Trash2, Shield, FileJson, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addSentryBreadcrumb } from '@/lib/sentry';
import { createLogger } from '@/lib/logger';

const log = createLogger('LGPD');

const LGPDPrivacySection = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const tenantId = profile?.tenant_id;

  const handleExportData = useCallback(async () => {
    if (!user || !tenantId) return;
    setExporting(true);
    addSentryBreadcrumb('LGPD data export requested', 'lgpd', 'info');

    try {
      const tables = ['profiles', 'leads', 'contratos', 'agendamentos', 'notifications', 'activity_logs'];
      const exportData: Record<string, unknown> = {
        exportDate: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        tenantId,
      };

      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .eq('tenant_id', tenantId)
            .limit(10000);
          if (!error && data) {
            exportData[table] = data;
          }
        } catch {
          exportData[table] = { error: 'Não foi possível exportar esta tabela' };
        }
      }

      // Profile data (user-specific, not tenant-scoped)
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) exportData['meu_perfil'] = data;
      } catch {
        // ignore
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jurify-dados-${user.email}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Dados exportados', description: 'Arquivo JSON baixado com sucesso.' });
      log.info('LGPD data export completed', { userId: user.id });
    } catch (err) {
      log.error('LGPD data export failed', err);
      toast({ title: 'Erro na exportação', description: 'Não foi possível exportar seus dados. Tente novamente.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  }, [user, tenantId, toast]);

  const handleDeleteAccount = useCallback(async () => {
    if (!user || deleteConfirmText !== 'EXCLUIR') return;
    setDeleting(true);
    addSentryBreadcrumb('LGPD account deletion requested', 'lgpd', 'warning');

    try {
      // Mark the profile as deletion_requested (actual deletion handled by admin/backend)
      await supabase
        .from('profiles')
        .update({
          subscription_status: 'deletion_requested',
        })
        .eq('id', user.id);

      toast({
        title: 'Solicitação registrada',
        description: 'Sua solicitação de exclusão foi registrada. Seus dados serão removidos em até 15 dias conforme a LGPD.',
      });

      log.info('LGPD account deletion requested', { userId: user.id });
      setShowDeleteDialog(false);

      // Sign out after requesting deletion
      setTimeout(() => void signOut(), 2000);
    } catch (err) {
      log.error('LGPD account deletion request failed', err);
      toast({ title: 'Erro', description: 'Não foi possível processar sua solicitação. Tente novamente.', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  }, [user, deleteConfirmText, toast, signOut]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Privacidade e Proteção de Dados (LGPD)</CardTitle>
          </div>
          <CardDescription>
            Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito de acessar, exportar e solicitar a exclusão dos seus dados pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Export */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileJson className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold">Exportar meus dados</h3>
                <Badge variant="secondary" className="text-[10px]">Art. 18, V</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Baixe todos os seus dados em formato JSON: perfil, leads, contratos, agendamentos e logs de atividade.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              disabled={exporting}
              data-testid="btn-lgpd-export"
            >
              <Download className={`h-4 w-4 mr-2 ${exporting ? 'animate-bounce' : ''}`} />
              {exporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>

          {/* Data Info */}
          <div className="p-4 rounded-lg border border-border bg-muted/30">
            <h3 className="text-sm font-semibold mb-2">Dados armazenados</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>• Perfil e preferências</span>
              <span>• Leads e contatos</span>
              <span>• Contratos e documentos</span>
              <span>• Agendamentos</span>
              <span>• Logs de atividade</span>
              <span>• Configurações do escritório</span>
            </div>
          </div>

          {/* Delete Account */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold text-destructive">Excluir minha conta</h3>
                <Badge variant="destructive" className="text-[10px]">Art. 18, VI</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Solicite a exclusão permanente de todos os seus dados. Esta ação é irreversível e será processada em até 15 dias úteis.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              data-testid="btn-lgpd-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Excluir conta permanentemente
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todos os seus dados serão removidos permanentemente, incluindo leads, contratos, agendamentos e configurações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Recomendamos exportar seus dados antes de prosseguir.
            </p>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm" className="text-sm">
                Digite <strong>EXCLUIR</strong> para confirmar:
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="EXCLUIR"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== 'EXCLUIR' || deleting}
              onClick={handleDeleteAccount}
            >
              {deleting ? 'Processando...' : 'Confirmar exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LGPDPrivacySection;
