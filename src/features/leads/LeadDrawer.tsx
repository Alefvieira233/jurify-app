import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Archive, RotateCcw } from 'lucide-react';
import type { Lead } from '@/hooks/useLeads';
import { useLeads } from '@/hooks/useLeads';
import ArquivarLeadDialog from './ArquivarLeadDialog';
import LeadDrawerAtendimento from './LeadDrawerAtendimento';
import LeadDrawerDados from './LeadDrawerDados';
import LeadDrawerOperacional from './LeadDrawerOperacional';
import LeadDrawerNotas from './LeadDrawerNotas';
import LeadDrawerHistorico from './LeadDrawerHistorico';

interface LeadDrawerProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusVariant = (status: string | null): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'novo':
      return 'default';
    case 'em_atendimento':
    case 'qualificado':
      return 'secondary';
    case 'perdido':
    case 'arquivado':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default function LeadDrawer({ lead, open, onOpenChange }: LeadDrawerProps) {
  const { archiveLead, unarchiveLead } = useLeads();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  if (!lead) return null;

  const isArchived = !!lead.arquivado_em;
  const initial = (lead.nome ?? lead.nome_completo ?? '?').charAt(0).toUpperCase();

  const handleUnarchive = async () => {
    setReactivating(true);
    try {
      await unarchiveLead(lead.id);
    } finally {
      setReactivating(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto">
        {/* Archived banner */}
        {isArchived && (
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm">
            <span className="font-medium">Este lead esta arquivado</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-yellow-300 hover:bg-yellow-100"
              onClick={() => { void handleUnarchive(); }}
              disabled={reactivating}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              {reactivating ? 'Reativando...' : 'Reativar'}
            </Button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-10">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white font-semibold text-lg">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <SheetTitle className="text-base font-semibold truncate">
              {lead.nome ?? lead.nome_completo ?? 'Sem nome'}
            </SheetTitle>
            {lead.status && (
              <Badge variant={statusVariant(lead.status)} className="mt-0.5 text-xs">
                {lead.status}
              </Badge>
            )}
          </div>
          {!isArchived && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => setArchiveDialogOpen(true)}
              aria-label="Arquivar lead"
            >
              <Archive className="h-4 w-4" />
            </Button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ArquivarLeadDialog
          lead={lead}
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          onArchive={archiveLead}
        />

        {/* Tabs */}
        <Tabs defaultValue="atendimento" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4 h-auto flex-wrap">
            <TabsTrigger value="atendimento" className="text-xs">Atendimento</TabsTrigger>
            <TabsTrigger value="dados" className="text-xs">Dados</TabsTrigger>
            <TabsTrigger value="operacional" className="text-xs">Operacional</TabsTrigger>
            <TabsTrigger value="notas" className="text-xs">Notas</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="atendimento" className="mt-0">
              <LeadDrawerAtendimento lead={lead} />
            </TabsContent>
            <TabsContent value="dados" className="mt-0">
              <LeadDrawerDados lead={lead} />
            </TabsContent>
            <TabsContent value="operacional" className="mt-0">
              <LeadDrawerOperacional lead={lead} />
            </TabsContent>
            <TabsContent value="notas" className="mt-0">
              <LeadDrawerNotas leadId={lead.id} />
            </TabsContent>
            <TabsContent value="historico" className="mt-0">
              <LeadDrawerHistorico leadId={lead.id} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
