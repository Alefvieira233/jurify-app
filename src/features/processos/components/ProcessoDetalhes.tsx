import { FileText, Clock, DollarSign, Folder } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Processo } from '@/hooks/useProcessos';
import { usePrazosProcessuais } from '@/hooks/usePrazosProcessuais';
import { useHonorarios } from '@/hooks/useHonorarios';
import { useDocumentosJuridicos } from '@/hooks/useDocumentosJuridicos';
import PrazoAlertaBadge from '@/features/prazos/components/PrazoAlertaBadge';

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  encerrado_vitoria: 'Encerrado — Vitória',
  encerrado_derrota: 'Encerrado — Derrota',
  encerrado_acordo: 'Encerrado — Acordo',
  arquivado: 'Arquivado',
};

const TIPO_LABELS: Record<string, string> = {
  civel: 'Cível', criminal: 'Criminal', trabalhista: 'Trabalhista',
  previdenciario: 'Previdenciário', familia: 'Família', empresarial: 'Empresarial',
  tributario: 'Tributário', administrativo: 'Administrativo', outro: 'Outro',
};

const HONORARIO_TIPO_LABELS: Record<string, string> = {
  fixo: 'Fixo', hora: 'Por hora', contingencia: 'Contingência',
  sucesso: 'Êxito', mensalidade: 'Mensalidade', outro: 'Outro',
};

const HONORARIO_STATUS_COLORS: Record<string, string> = {
  vigente: 'bg-emerald-500/10 text-emerald-600',
  pago: 'bg-blue-500/10 text-blue-600',
  inadimplente: 'bg-red-500/10 text-red-600',
  cancelado: 'bg-slate-500/10 text-slate-500',
  disputado: 'bg-amber-500/10 text-amber-600',
};

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('pt-BR') : '—';

interface ProcessoDetalhesProps {
  processo: Processo;
}

// ── Prazos tab ───────────────────────────────────────────────────────────────

const PrazosTab = ({ processoId }: { processoId: string }) => {
  const { prazos, loading } = usePrazosProcessuais({ processoId });

  if (loading) {
    return <div className="space-y-2 pt-4">{[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  if (!prazos.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <Clock className="w-8 h-8 opacity-40" />
        <p className="text-sm">Nenhum prazo cadastrado para este processo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4">
      {prazos.map(p => (
        <div key={p.id} className="flex items-start justify-between gap-4 border rounded-md p-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm capitalize">{p.tipo.replace(/_/g, ' ')}</span>
              <PrazoAlertaBadge dataPrazo={p.data_prazo} status={p.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{p.descricao}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vencimento: {fmtDate(p.data_prazo)}
              {p.data_cumprimento && <> · Cumprido em: {fmtDate(p.data_cumprimento)}</>}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Honorários tab ───────────────────────────────────────────────────────────

const HonorariosTab = ({ processoId }: { processoId: string }) => {
  const { honorarios, loading } = useHonorarios({ processoId });

  if (loading) {
    return <div className="space-y-2 pt-4">{[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  if (!honorarios.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <DollarSign className="w-8 h-8 opacity-40" />
        <p className="text-sm">Nenhum honorário cadastrado para este processo.</p>
      </div>
    );
  }

  const totalAcordado = honorarios.reduce((s, h) => s + (h.valor_total_acordado ?? 0), 0);
  const totalRecebido = honorarios.reduce((s, h) => s + (h.valor_recebido ?? 0), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="border rounded-md p-3 text-center">
          <p className="text-muted-foreground text-xs mb-1">Total Acordado</p>
          <p className="font-semibold">{fmt(totalAcordado)}</p>
        </div>
        <div className="border rounded-md p-3 text-center">
          <p className="text-muted-foreground text-xs mb-1">Recebido</p>
          <p className="font-semibold text-emerald-600">{fmt(totalRecebido)}</p>
        </div>
        <div className="border rounded-md p-3 text-center">
          <p className="text-muted-foreground text-xs mb-1">A Receber</p>
          <p className="font-semibold text-amber-600">{fmt(Math.max(0, totalAcordado - totalRecebido))}</p>
        </div>
      </div>

      <div className="space-y-2">
        {honorarios.map(h => (
          <div key={h.id} className="flex items-center justify-between gap-4 border rounded-md p-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{HONORARIO_TIPO_LABELS[h.tipo] ?? h.tipo}</span>
                <Badge className={`text-xs ${HONORARIO_STATUS_COLORS[h.status] ?? ''}`}>
                  {h.status}
                </Badge>
              </div>
              {h.data_vencimento && (
                <p className="text-xs text-muted-foreground mt-0.5">Vencimento: {fmtDate(h.data_vencimento)}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-medium">{h.valor_total_acordado ? fmt(h.valor_total_acordado) : '—'}</p>
              {h.valor_recebido !== null && (
                <p className="text-xs text-muted-foreground">Recebido: {fmt(h.valor_recebido)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Documentos tab ───────────────────────────────────────────────────────────

const DocumentosTab = ({ processoId }: { processoId: string }) => {
  const { documentos, loading } = useDocumentosJuridicos({ processoId });

  if (loading) {
    return <div className="space-y-2 pt-4">{[1, 2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (!documentos.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
        <Folder className="w-8 h-8 opacity-40" />
        <p className="text-sm">Nenhum documento vinculado a este processo.</p>
      </div>
    );
  }

  const fmtSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2 pt-4">
      {documentos.map(d => (
        <div key={d.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{d.nome_original}</p>
              <p className="text-xs text-muted-foreground">
                {d.tipo_documento.replace(/_/g, ' ')} · {fmtSize(d.tamanho_bytes)} · {fmtDate(d.created_at)}
              </p>
            </div>
          </div>
          {d.url_publica && (
            <a
              href={d.url_publica}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline shrink-0"
            >
              Baixar
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Resumo tab ───────────────────────────────────────────────────────────────

const ResumoTab = ({ processo }: { processo: Processo }) => (
  <div className="space-y-4 pt-4">
    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
      <div><span className="font-medium text-muted-foreground">Número:</span> <span className="ml-1">{processo.numero_processo || '—'}</span></div>
      <div><span className="font-medium text-muted-foreground">Tipo:</span> <span className="ml-1">{TIPO_LABELS[processo.tipo_acao] ?? processo.tipo_acao}</span></div>
      <div><span className="font-medium text-muted-foreground">Tribunal:</span> <span className="ml-1">{processo.tribunal || '—'}</span></div>
      <div><span className="font-medium text-muted-foreground">Vara:</span> <span className="ml-1">{processo.vara || '—'}</span></div>
      <div><span className="font-medium text-muted-foreground">Comarca:</span> <span className="ml-1">{processo.comarca || '—'}</span></div>
      <div><span className="font-medium text-muted-foreground">Fase:</span> <span className="ml-1 capitalize">{processo.fase_processual.replace(/_/g, ' ')}</span></div>
      <div><span className="font-medium text-muted-foreground">Posição:</span> <span className="ml-1 capitalize">{processo.posicao}</span></div>
      <div>
        <span className="font-medium text-muted-foreground">Status:</span>{' '}
        <span className="ml-1">{STATUS_LABELS[processo.status] ?? processo.status}</span>
      </div>
      {processo.valor_causa && (
        <div><span className="font-medium text-muted-foreground">Valor da Causa:</span> <span className="ml-1">{fmt(processo.valor_causa)}</span></div>
      )}
      {processo.data_distribuicao && (
        <div><span className="font-medium text-muted-foreground">Distribuição:</span> <span className="ml-1">{fmtDate(processo.data_distribuicao)}</span></div>
      )}
    </div>

    {processo.observacoes && (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Observações</p>
        <p className="text-sm bg-muted/50 rounded p-3">{processo.observacoes}</p>
      </div>
    )}

    {processo.partes_contrarias && processo.partes_contrarias.length > 0 && (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">Partes Contrárias</p>
        <div className="flex flex-wrap gap-1">
          {processo.partes_contrarias.map((parte, i) => (
            <Badge key={i} variant="outline">{parte}</Badge>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const ProcessoDetalhes = ({ processo }: ProcessoDetalhesProps) => {
  return (
    <Tabs defaultValue="resumo" className="w-full">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="resumo" className="gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Resumo
        </TabsTrigger>
        <TabsTrigger value="prazos" className="gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Prazos
        </TabsTrigger>
        <TabsTrigger value="honorarios" className="gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Honorários
        </TabsTrigger>
        <TabsTrigger value="documentos" className="gap-1.5">
          <Folder className="w-3.5 h-3.5" />
          Documentos
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resumo">
        <ResumoTab processo={processo} />
      </TabsContent>

      <TabsContent value="prazos">
        <PrazosTab processoId={processo.id} />
      </TabsContent>

      <TabsContent value="honorarios">
        <HonorariosTab processoId={processo.id} />
      </TabsContent>

      <TabsContent value="documentos">
        <DocumentosTab processoId={processo.id} />
      </TabsContent>
    </Tabs>
  );
};

export default ProcessoDetalhes;
