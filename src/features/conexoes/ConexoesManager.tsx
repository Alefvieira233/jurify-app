import { useState, useMemo } from 'react';
import {
  Plus, Search, MoreHorizontal, Wifi, WifiOff, RefreshCw,
  Trash2, Eye, Link2, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useConexoes, type ConexaoWhatsApp } from '@/hooks/useConexoes';
import { useRBAC } from '@/hooks/useRBAC';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ConnectionTypeChooser from './ConnectionTypeChooser';
import QRCodeWizard from './QRCodeWizard';
import ConnectionDetailsDrawer from './ConnectionDetailsDrawer';

type NewConnectionStep = 'choose' | 'wizard';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Wifi }> = {
  connected:    { label: 'Conectado',    variant: 'default',     icon: Wifi },
  disconnected: { label: 'Desconectado', variant: 'destructive', icon: WifiOff },
  connecting:   { label: 'Conectando',   variant: 'secondary',   icon: RefreshCw },
  error:        { label: 'Erro',         variant: 'destructive', icon: AlertTriangle },
};

const ConexoesManager = () => {
  usePageTitle('Conexões');
  const { conexoes, isLoading, deleteConexao } = useConexoes();
  const { can } = useRBAC();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [newConnOpen, setNewConnOpen] = useState(false);
  const [newConnStep, setNewConnStep] = useState<NewConnectionStep>('choose');
  const [selectedConexao, setSelectedConexao] = useState<ConexaoWhatsApp | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const canCreate = can('conexoes', 'create');
  const canDelete = can('conexoes', 'delete');

  const filtered = useMemo(() => {
    if (!search.trim()) return conexoes;
    const q = search.toLowerCase();
    return conexoes.filter(
      (c) =>
        c.nome?.toLowerCase().includes(q) ||
        c.telefone?.toLowerCase().includes(q) ||
        c.instance_name?.toLowerCase().includes(q),
    );
  }, [conexoes, search]);

  const handleNewConnection = () => {
    setNewConnStep('choose');
    setNewConnOpen(true);
  };

  const handleTypeSelected = (type: 'evolution' | 'oficial') => {
    if (type === 'evolution') {
      setNewConnStep('wizard');
    }
  };

  const handleConnected = (instanceName: string) => {
    setNewConnOpen(false);
    toast({ title: 'Conexão estabelecida', description: `Instância ${instanceName} conectada.` });
  };

  const handleOpenDetails = (conexao: ConexaoWhatsApp) => {
    setSelectedConexao(conexao);
    setDetailsOpen(true);
  };

  const handleReconnect = async (conexao: ConexaoWhatsApp) => {
    if (!conexao.instance_name) return;
    try {
      const { data, error } = await supabase.functions.invoke('evolution-manager', {
        body: { action: 'restart', instanceName: conexao.instance_name },
      });
      if (error) throw error;
      toast({ title: data?.success ? 'Reconexão iniciada' : 'Falha na reconexão' });
    } catch {
      toast({ title: 'Erro ao reconectar', variant: 'destructive' });
    }
  };

  const handleDelete = async (conexao: ConexaoWhatsApp) => {
    try {
      // Try to delete instance from Evolution first
      if (conexao.instance_name) {
        await supabase.functions.invoke('evolution-manager', {
          body: { action: 'delete', instanceName: conexao.instance_name },
        });
      }
      await deleteConexao(conexao.id);
    } catch {
      toast({ title: 'Erro ao excluir conexão', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.disconnected!;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {cfg.label}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Conexões</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie suas conexões WhatsApp e canais de comunicação
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleNewConnection} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Conexão
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou instância..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} conexão{filtered.length !== 1 ? 'ões' : ''}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Link2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {search ? 'Nenhuma conexão encontrada' : 'Nenhuma conexão configurada'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            {search
              ? 'Tente buscar com outros termos.'
              : 'Conecte seu WhatsApp para começar a atender seus clientes.'}
          </p>
          {!search && canCreate && (
            <Button onClick={handleNewConnection} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conexão
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conexão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Última sincronização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((conexao) => (
                <TableRow
                  key={conexao.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOpenDetails(conexao)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                        {conexao.avatar_url ? (
                          <img src={conexao.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                            {conexao.nome?.charAt(0)?.toUpperCase() || 'W'}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{conexao.nome || 'WhatsApp'}</p>
                        {conexao.telefone && (
                          <p className="text-xs text-muted-foreground">{conexao.telefone}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {conexao.tipo === 'evolution' ? 'Não Oficial' : conexao.tipo === 'oficial' ? 'Oficial' : 'Cloud API'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(conexao.last_sync)}
                  </TableCell>
                  <TableCell>{getStatusBadge(conexao.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDetails(conexao); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {conexao.status === 'disconnected' && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void handleReconnect(conexao); }}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reconectar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.stopPropagation(); void handleDelete(conexao); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New Connection Sheet */}
      <Sheet open={newConnOpen} onOpenChange={setNewConnOpen}>
        <SheetContent side="right" className="sm:max-w-lg p-0 overflow-y-auto">
          {newConnStep === 'choose' ? (
            <ConnectionTypeChooser onSelect={handleTypeSelected} />
          ) : (
            <QRCodeWizard
              onBack={() => setNewConnStep('choose')}
              onConnected={handleConnected}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Details Drawer */}
      <ConnectionDetailsDrawer
        conexao={selectedConexao}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
};

export default ConexoesManager;
