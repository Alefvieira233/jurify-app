import { useState, useMemo } from 'react';
import {
  Plus, Search, MoreHorizontal, RefreshCw,
  Trash2, GripVertical, LayoutGrid, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useConexoes, type ConexaoWhatsApp } from '@/hooks/useConexoes';
import { useRBAC } from '@/hooks/useRBAC';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getInitials } from '@/utils/formatting';
import ConnectionTypeChooser from './ConnectionTypeChooser';
import QRCodeWizard from './QRCodeWizard';
import ConnectionDetailsDrawer from './ConnectionDetailsDrawer';

type NewConnectionStep = 'choose' | 'wizard';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  connected:    { label: 'Conectado',    variant: 'default' },
  disconnected: { label: 'Desconectado', variant: 'destructive' },
  connecting:   { label: 'Conectando',   variant: 'secondary' },
  error:        { label: 'Erro',         variant: 'destructive' },
};

const TIPO_LABEL: Record<string, string> = {
  kapso:     'Kapso QR',
  oficial:   'Kapso Oficial',
  cloud_api: 'Cloud API',
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
  const [visibleCols, setVisibleCols] = useState({ status_padrao: true, departamento: true });

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

  const handleTypeSelected = (type: 'kapso_qr' | 'kapso_oficial') => {
    if (type === 'kapso_qr') {
      setNewConnStep('wizard');
    }
    // kapso_oficial flow will be handled when Kapso official setup is implemented
  };

  const handleConnected = (instanceName: string) => {
    setNewConnOpen(false);
    toast({ title: 'Conexão estabelecida', description: `Instância ${instanceName} conectada com sucesso.` });
  };

  const handleOpenDetails = (conexao: ConexaoWhatsApp) => {
    setSelectedConexao(conexao);
    setDetailsOpen(true);
  };

  const handleReconnect = async (conexao: ConexaoWhatsApp) => {
    if (!conexao.instance_name) return;
    try {
      const { data, error } = await supabase.functions.invoke('kapso-manager', {
        body: { action: 'qrcode', instanceName: conexao.instance_name },
      });
      if (error) throw error;
      toast({ title: data?.success ? 'Reconexão iniciada' : 'Falha na reconexão' });
    } catch {
      toast({ title: 'Erro ao reconectar', variant: 'destructive' });
    }
  };

  const handleDelete = async (conexao: ConexaoWhatsApp) => {
    try {
      if (conexao.instance_name) {
        await supabase.functions.invoke('kapso-manager', {
          body: { action: 'delete', instanceName: conexao.instance_name },
        });
      }
      await deleteConexao(conexao.id);
    } catch {
      toast({ title: 'Erro ao excluir conexão', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conexões</h1>
        <p className="text-muted-foreground">
          Gerencie suas conexões com canais de comunicação.
        </p>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar conexões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={visibleCols.status_padrao}
                onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, status_padrao: !!v }))}
              >
                Status Padrão
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleCols.departamento}
                onCheckedChange={(v) => setVisibleCols((c) => ({ ...c, departamento: !!v }))}
              >
                Departamento
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {canCreate && (
            <Button onClick={handleNewConnection}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conexão
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {search ? (
            <>
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Search className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhuma conexão encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Nenhum canal corresponde aos critérios da busca.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-2">Nenhuma conexão configurada</h3>
              <p className="text-sm text-muted-foreground mb-8 max-w-md">
                Conecte seu primeiro número de WhatsApp para iniciar.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {/* Card Kapso QR */}
                  <button
                    type="button"
                    onClick={() => { setNewConnStep('wizard'); setNewConnOpen(true); }}
                    className="group text-left border rounded-xl p-6 hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Kapso QR</h4>
                        <p className="text-xs text-muted-foreground">Conexão rápida via QR Code ou Pair Code</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {['Conexão rápida', 'Sem aprovação de templates', 'Sem janela de conversação'].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <svg className="h-3.5 w-3.5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </button>

                  {/* Card Kapso Oficial */}
                  <button
                    type="button"
                    onClick={() => { setNewConnStep('choose'); setNewConnOpen(true); }}
                    className="group text-left border rounded-xl p-6 hover:border-green-500/50 hover:bg-green-500/5 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <svg className="h-6 w-6 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">Kapso Oficial</h4>
                        <p className="text-xs text-muted-foreground">API oficial WhatsApp Business da Meta</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {['Selo verde verificado oficial', 'Envio de campanhas em massa', 'Maior confiabilidade empresarial'].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <svg className="h-3.5 w-3.5 text-green-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </button>
                </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>CONEXÃO</TableHead>
                  <TableHead>STATUS</TableHead>
                  {visibleCols.status_padrao && <TableHead>STATUS PADRÃO</TableHead>}
                  {visibleCols.departamento && <TableHead>DEPARTAMENTO</TableHead>}
                  <TableHead className="w-10" />
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
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {conexao.avatar_url && <AvatarImage src={conexao.avatar_url} />}
                          <AvatarFallback className="text-sm font-semibold">
                            {getInitials(conexao.nome || 'WP')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{conexao.nome || 'WhatsApp'}</p>
                          <p className="text-sm text-muted-foreground">
                            {TIPO_LABEL[conexao.tipo] ?? conexao.tipo}
                            {conexao.telefone ? ` | ${conexao.telefone}` : ''}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const cfg = STATUS_BADGE[conexao.status] ?? STATUS_BADGE.disconnected!;
                        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
                      })()}
                    </TableCell>
                    {visibleCols.status_padrao && (
                      <TableCell className="text-muted-foreground">
                        {conexao.status_padrao || '—'}
                      </TableCell>
                    )}
                    {visibleCols.departamento && (
                      <TableCell className="text-muted-foreground">
                        {conexao.departamento?.nome || '—'}
                      </TableCell>
                    )}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenDetails(conexao); }}>
                            <Activity className="h-4 w-4 mr-2" />
                            Diagnóstico
                          </DropdownMenuItem>
                          {conexao.status === 'disconnected' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); void handleReconnect(conexao); }}>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Forçar Reconexão
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); void handleDelete(conexao); }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remover Canal
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
          <p className="text-sm text-muted-foreground">
            {filtered.length} conexão{filtered.length !== 1 ? 'ões' : ''}
          </p>
        </>
      )}

      {/* New Connection Sheet (side drawer) */}
      <Sheet open={newConnOpen} onOpenChange={setNewConnOpen}>
        <SheetContent side="right" className="w-[500px] sm:max-w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Escolha o tipo de conexão WhatsApp</SheetTitle>
            <SheetDescription>
              Selecione como deseja conectar sua conta WhatsApp à plataforma
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {newConnStep === 'choose' ? (
              <ConnectionTypeChooser onSelect={handleTypeSelected} />
            ) : (
              <QRCodeWizard
                onBack={() => setNewConnStep('choose')}
                onConnected={handleConnected}
              />
            )}
          </div>
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
