import { useState, useMemo } from 'react';
import {
  Search, MoreHorizontal, RefreshCw, Trash2,
  MessageSquare, Settings, Wifi, WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useConexoes, type ConexaoWhatsApp } from '@/hooks/useConexoes';
import { useRBAC } from '@/hooks/useRBAC';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/hooks/use-toast';
import { toUserMessage } from '@/lib/errorMessages';
import ConfirmDialog from '@/components/ConfirmDialog';
import WhatsAppWizard from './WhatsAppWizard';
import ConnectionDetailsDrawer from './ConnectionDetailsDrawer';
import ErrorState from '@/components/ErrorState';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive'; dot: string }> = {
  connected:    { label: 'Conectado',     variant: 'default',     dot: 'bg-green-500' },
  disconnected: { label: 'Desconectado',  variant: 'destructive', dot: 'bg-red-500' },
  connecting:   { label: 'Conectando...', variant: 'secondary',   dot: 'bg-amber-500 animate-pulse' },
  error:        { label: 'Erro',          variant: 'destructive', dot: 'bg-red-500' },
};

function formatPhone(phone: string | null): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  return phone;
}

function timeSince(date: string | null): string {
  if (!date) return '—';
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `há ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `há ${Math.floor(seconds / 3600)}h`;
  return `há ${Math.floor(seconds / 86400)}d`;
}

const ConexoesManager = () => {
  usePageTitle('Conexões');
  const { conexoes, isLoading, isError, refetch: refetchConexoes, deleteConexao } = useConexoes();
  const { can } = useRBAC();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedConexao, setSelectedConexao] = useState<ConexaoWhatsApp | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ConexaoWhatsApp | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const canCreate = can('conexoes', 'create');
  const canDelete = can('conexoes', 'delete');

  const filtered = useMemo(() => {
    if (!search.trim()) return conexoes;
    const q = search.toLowerCase();
    return conexoes.filter(
      (c) => c.nome?.toLowerCase().includes(q) || c.telefone?.toLowerCase().includes(q),
    );
  }, [conexoes, search]);

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deleteConexao(deleteTarget.id);
      toast({ title: 'Conexão removida' });
    } catch (err) {
      toast({ title: 'Erro ao remover conexão', description: toUserMessage(err), variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const handleReconnect = () => {
    // Open the wizard to generate a new setup link
    setWizardOpen(true);
  };

  if (isError) {
    return (
      <div className="space-y-6 pb-12">
        <ErrorState title="Erro ao carregar conexões" onRetry={() => void refetchConexoes()} />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conexões</h1>
        <p className="text-muted-foreground">
          Gerencie suas conexões WhatsApp.
        </p>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : conexoes.length === 0 && !search ? (
        /* ===== EMPTY STATE ===== */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mb-6">
            <svg className="h-10 w-10 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-2">Conecte seu WhatsApp ao Jurify</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Receba mensagens dos seus clientes, responda direto pela plataforma
            e deixe a IA cuidar do primeiro atendimento.
          </p>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-8">
            {[
              'Atendimento automático 24h',
              'Histórico completo de conversas',
              'Leads criados automaticamente',
            ].map((text) => (
              <div key={text} className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {text}
              </div>
            ))}
          </div>

          {canCreate && (
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8"
              onClick={() => setWizardOpen(true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Conectar WhatsApp
            </Button>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            Leva menos de 2 minutos · Seu número continua funcionando normalmente
          </p>
        </div>
      ) : (
        <>
          {/* Search + Add button */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                aria-label="Pesquisar conexões..." placeholder="Pesquisar conexões..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {canCreate && (
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => setWizardOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Conectar WhatsApp
              </Button>
            )}
          </div>

          {/* Search no results */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma conexão encontrada para "{search}"</p>
            </div>
          ) : (
            /* ===== CONNECTION CARDS ===== */
            <div className="grid gap-4">
              {filtered.map((conexao) => {
                const cfg = STATUS_CONFIG[conexao.status] ?? STATUS_CONFIG.disconnected!;
                return (
                  <div
                    key={conexao.id}
                    className="rounded-xl border bg-card p-5 hover:border-primary/20 transition-colors cursor-pointer"
                    onClick={() => { setSelectedConexao(conexao); setDetailsOpen(true); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedConexao(conexao); setDetailsOpen(true); } }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          {conexao.status === 'connected' ? (
                            <Wifi className="h-5 w-5 text-green-600" />
                          ) : (
                            <WifiOff className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{conexao.nome || 'WhatsApp'}</h3>
                            <Badge variant={cfg.variant} className="text-xs">
                              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
                              {cfg.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {formatPhone(conexao.telefone)}
                          </p>
                          {conexao.last_heartbeat && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Última atividade: {timeSince(conexao.last_heartbeat)}
                            </p>
                          )}
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações da conexão</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedConexao(conexao); setDetailsOpen(true); }}>
                            <Settings className="h-4 w-4 mr-2" />
                            Detalhes
                          </DropdownMenuItem>
                          {conexao.status === 'disconnected' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReconnect(); }}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reconectar
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteTarget(conexao); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Desconectar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Wizard Sheet */}
      <Sheet open={wizardOpen} onOpenChange={setWizardOpen}>
        <SheetContent side="right" className="w-[480px] sm:max-w-[480px] overflow-y-auto p-6">
          <WhatsAppWizard
            onClose={() => setWizardOpen(false)}
            onConnected={() => setWizardOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Details Drawer */}
      <ConnectionDetailsDrawer
        conexao={selectedConexao}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
        title="Desconectar WhatsApp?"
        description={`O número ${deleteTarget?.telefone || deleteTarget?.nome || 'WhatsApp'} será desconectado. Você poderá reconectar a qualquer momento.`}
        onConfirm={() => { void handleDeleteConfirmed(); }}
        loading={deleteLoading}
        destructive
      />
    </div>
  );
};

export default ConexoesManager;
