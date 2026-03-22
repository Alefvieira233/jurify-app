import { useState, useMemo } from 'react';
import {
  Plus, Search, MoreHorizontal, Wifi, WifiOff, RefreshCw,
  Trash2, Eye, Link2, AlertTriangle, ShieldCheck, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { getAvatarHex, getInitials } from '@/utils/formatting';
import ConnectionTypeChooser from './ConnectionTypeChooser';
import QRCodeWizard from './QRCodeWizard';
import ConnectionDetailsDrawer from './ConnectionDetailsDrawer';

type NewConnectionStep = 'choose' | 'wizard';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: typeof Wifi }> = {
  connected:    { label: 'Conectado',    bg: 'bg-emerald-500/10',     text: 'text-emerald-500', dot: 'bg-emerald-500', icon: Wifi },
  disconnected: { label: 'Desconectado', bg: 'bg-red-500/10',         text: 'text-red-500',     dot: 'bg-red-500',     icon: WifiOff },
  connecting:   { label: 'Conectando',   bg: 'bg-amber-500/10',       text: 'text-amber-500',   dot: 'bg-amber-500 animate-pulse', icon: RefreshCw },
  error:        { label: 'Erro Crítico', bg: 'bg-destructive/10',     text: 'text-destructive', dot: 'bg-destructive animate-ping', icon: AlertTriangle },
};

const ConexoesManager = () => {
  usePageTitle('Conexões & Canais');
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
    toast({ title: 'Conexão estabelecida', description: `Instância ${instanceName} conectada com sucesso.` });
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nenhuma sincronização';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Premium (Lex Obsidian) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-3">
            <Link2 className="w-3.5 h-3.5" />
            Módulo Enterprise
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Conexões & Canais
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Gerencie todas as entradas e saídas de comunicação. Monitore instâncias, rotas de atendimento e saúde do servidor de mensagens.
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleNewConnection} size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-[12px]">
            <Plus className="h-4 w-4" />
            Nova Conexão
          </Button>
        )}
      </div>

      {/* Dashboard Metrics / Quick Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 p-4 rounded-[16px] border border-border/10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou instância..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-background/50 border-border/20 rounded-[12px]"
          />
        </div>
        <div className="flex items-center gap-6 px-4">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total</p>
            <p className="text-xl font-black">{conexoes.length}</p>
          </div>
          <div className="w-px h-8 bg-border/20"></div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Conectados</p>
            <p className="text-xl font-black text-emerald-500">
              {conexoes.filter(c => c.status === 'connected').length}
            </p>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-[24px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border/20 rounded-[24px] bg-muted/5">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            {search ? 'Nenhuma conexão encontrada' : 'Central de Comunicação Vazia'}
          </h3>
          <p className="text-base text-muted-foreground mb-8 max-w-md">
            {search
              ? 'Nenhum canal corresponde aos critérios da busca.'
              : 'Conecte o seu primeiro número de WhatsApp para iniciar os fluxos de automação e captação de leads.'}
          </p>
          {!search && canCreate && (
            <Button onClick={handleNewConnection} size="lg" className="rounded-[12px]">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Canal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((conexao) => {
            const cfg = STATUS_CONFIG[conexao.status] || STATUS_CONFIG['disconnected']!;
            const bgAvatar = conexao.avatar_url ? `url(${conexao.avatar_url})` : getAvatarHex(conexao.nome || 'W');
            
            return (
              <div
                key={conexao.id}
                className="group relative bg-background border border-border/10 rounded-[24px] p-6 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
              >
                {/* Glow effect matching status */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-20 pointer-events-none ${cfg.bg.replace('/10', '')}`} />

                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-background shadow-lg"
                      style={{ background: conexao.avatar_url ? 'transparent' : bgAvatar, backgroundImage: conexao.avatar_url ? `url(${conexao.avatar_url})` : 'none', backgroundSize: 'cover' }}
                    >
                      {!conexao.avatar_url && getInitials(conexao.nome || 'WP')}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-foreground leading-tight">
                        {conexao.nome || 'WhatsApp'}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {conexao.telefone || 'Sem número'}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-[12px]">
                      <DropdownMenuItem onClick={() => handleOpenDetails(conexao)} className="rounded-[8px] cursor-pointer">
                        <Activity className="h-4 w-4 mr-2" />
                        Diagnóstico & Logs
                      </DropdownMenuItem>
                      {conexao.status === 'disconnected' && (
                        <DropdownMenuItem onClick={() => { void handleReconnect(conexao); }} className="rounded-[8px] cursor-pointer">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Forçar Reconexão
                        </DropdownMenuItem>
                      )}
                      {canDelete && (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive rounded-[8px] cursor-pointer"
                          onClick={() => { void handleDelete(conexao); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Canal
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-4">
                  {/* Status row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Estado</span>
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} text-xs font-semibold`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </div>
                  </div>

                  {/* Engine row */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Motor</span>
                    <Badge variant="outline" className="text-[10px] font-mono border-border/10">
                      {conexao.tipo === 'evolution' ? 'API Não Oficial' : conexao.tipo === 'oficial' ? 'Cloud API Oficial' : 'Desconhecido'}
                    </Badge>
                  </div>

                  {/* Sync row */}
                  <div className="flex items-center justify-between border-t border-border/5 pt-4">
                    <span className="text-[11px] w-full text-center text-muted-foreground">
                      Última sincronia: <b className="font-medium text-foreground">{formatDate(conexao.last_sync)}</b>
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={() => handleOpenDetails(conexao)}
                  className="w-full mt-4 bg-muted/40 hover:bg-muted/80 text-foreground border border-border/5 rounded-[12px]" 
                  variant="secondary"
                >
                  <Eye className="w-4 h-4 mr-2 text-muted-foreground" />
                  Visualizar Painel de Controle
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* New Connection Sheet */}
      <Sheet open={newConnOpen} onOpenChange={setNewConnOpen}>
        <SheetContent side="right" className="sm:max-w-lg md:max-w-xl p-0 overflow-y-auto bg-background/95 backdrop-blur-xl border-l border-border/10 shadow-2xl">
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
