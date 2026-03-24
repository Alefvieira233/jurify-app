import { useMemo, useState } from 'react';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { MOTIVOS_ARQUIVAMENTO } from '@/types/crm-operacional';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Archive, RotateCcw, Inbox } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useRBAC } from '@/hooks/useRBAC';

/** Map motivo value → label for display */
const motivoLabelMap = new Map<string, string>(
  MOTIVOS_ARQUIVAMENTO.map((m) => [m.value, m.label]),
);

function getMotivoLabel(motivo: string | null): string {
  if (!motivo) return 'Sem motivo';
  // motivo_arquivamento may contain " — observacao" suffix
  const key = motivo.split(' \u2014 ')[0] ?? motivo;
  return motivoLabelMap.get(key) ?? motivo;
}

function getMotivoKey(motivo: string | null): string {
  if (!motivo) return 'sem_motivo';
  const key: string = motivo.split(' \u2014 ')[0] ?? motivo;
  return key;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function ArquivadosView() {
  usePageTitle('Leads Arquivados');
  const { leads, loading, unarchiveLead } = useLeads();
  const { members } = useTeamMembers();
  const { can } = useRBAC();
  const canUnarchive = can('leads', 'update');
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);

  // Build member lookup
  const memberMap = useMemo(
    () => new Map(members.map((m) => [m.id, m.nome_completo])),
    [members],
  );

  // Filter archived leads
  const archivedLeads = useMemo(
    () => leads.filter((l) => !!l.arquivado_em),
    [leads],
  );

  // Breakdown by motivo
  const motivoBreakdown = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();
    for (const lead of archivedLeads) {
      const key = getMotivoKey(lead.motivo_arquivamento);
      const label = getMotivoLabel(lead.motivo_arquivamento);
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { label, count: 1 });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  }, [archivedLeads]);

  const handleUnarchive = async (lead: Lead) => {
    setUnarchivingId(lead.id);
    try {
      await unarchiveLead(lead.id);
    } finally {
      setUnarchivingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`skeleton-card-${i}`} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Archive className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Leads Arquivados</h2>
        <Badge variant="secondary" className="ml-2">
          {archivedLeads.length}
        </Badge>
      </div>

      {/* Summary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Arquivados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{archivedLeads.length}</p>
          </CardContent>
        </Card>
        {motivoBreakdown.slice(0, 3).map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground truncate">
                {item.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{item.count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Remaining motivo badges if more than 3 */}
      {motivoBreakdown.length > 3 && (
        <div className="flex flex-wrap gap-2">
          {motivoBreakdown.slice(3).map((item) => (
            <Badge key={item.label} variant="outline">
              {item.label}: {item.count}
            </Badge>
          ))}
        </div>
      )}

      {/* Table of archived leads */}
      {archivedLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              Nenhum lead arquivado encontrado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Data Arquivamento</TableHead>
                <TableHead>Reativação Prevista</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archivedLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">
                    {lead.nome ?? lead.nome_completo ?? 'Sem nome'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getMotivoLabel(lead.motivo_arquivamento)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(lead.arquivado_em)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(lead.data_reativacao_prevista)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.responsavel_id === '__ia__'
                      ? 'IA (automático)'
                      : lead.responsavel_id
                        ? memberMap.get(lead.responsavel_id) ?? 'Desconhecido'
                        : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {canUnarchive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        disabled={unarchivingId === lead.id}
                        onClick={() => { void handleUnarchive(lead); }}
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        {unarchivingId === lead.id ? 'Reativando...' : 'Reativar'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
