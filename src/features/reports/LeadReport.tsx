/**
 * LeadReport — Printable/exportable PDF report for a specific lead.
 *
 * Shows: client info, processes, deadlines, fees, conversation summary.
 * Uses browser print (Ctrl+P → Save as PDF) — zero external dependencies.
 */

import { memo, useCallback } from 'react';
import { Printer, FileText, Scale, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Lead } from '@/hooks/useLeads';

interface LeadReportProps {
  lead: Lead;
  processos?: Array<{
    numero_processo?: string;
    tipo_acao?: string;
    fase_processual?: string;
    tribunal?: string;
  }>;
  prazos?: Array<{
    tipo?: string;
    descricao?: string;
    data_prazo?: string;
    dias_restantes?: number;
  }>;
  honorarios?: Array<{
    tipo?: string;
    valor_total_acordado?: number;
    valor_recebido?: number;
    status?: string;
  }>;
  conversationSummary?: string;
  officeName?: string;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const LeadReport = memo(({
  lead,
  processos = [],
  prazos = [],
  honorarios = [],
  conversationSummary,
  officeName = 'Escritório de Advocacia',
}: LeadReportProps) => {

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div>
      {/* Print button (hidden when printing) */}
      <div className="print:hidden mb-4 flex justify-end">
        <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
          <Printer className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Report content (optimized for print) */}
      <div className="bg-white text-black p-8 rounded-lg border print:border-0 print:p-0 print:shadow-none max-w-[800px] mx-auto print:max-w-full">

        {/* Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{officeName}</h1>
              <p className="text-sm text-gray-500 mt-1">Relatório do Cliente</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Gerado em</p>
              <p className="text-sm font-semibold">{new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-gray-700 print:text-black" />
            <h2 className="text-lg font-bold text-gray-900">Dados do Cliente</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Nome</p>
              <p className="font-semibold">{lead.nome_completo || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-gray-500">Telefone</p>
              <p className="font-semibold">{lead.telefone || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-gray-500">Email</p>
              <p className="font-semibold">{lead.email || 'Não informado'}</p>
            </div>
            <div>
              <p className="text-gray-500">Área Jurídica</p>
              <p className="font-semibold">{lead.area_juridica || 'Não informada'}</p>
            </div>
            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-semibold capitalize">{lead.status?.replace('_', ' ') || 'Novo'}</p>
            </div>
            <div>
              <p className="text-gray-500">Valor da Causa</p>
              <p className="font-semibold">{lead.valor_causa ? fmtBRL(Number(lead.valor_causa)) : 'Não informado'}</p>
            </div>
          </div>
        </section>

        {/* Processos */}
        {processos.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-gray-700 print:text-black" />
              <h2 className="text-lg font-bold text-gray-900">Processos Ativos ({processos.length})</h2>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-600">Número</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Fase</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Tribunal</th>
                </tr>
              </thead>
              <tbody>
                {processos.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-xs">{p.numero_processo ?? '—'}</td>
                    <td className="py-2">{p.tipo_acao ?? '—'}</td>
                    <td className="py-2">{p.fase_processual ?? '—'}</td>
                    <td className="py-2">{p.tribunal ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Prazos */}
        {prazos.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-gray-700 print:text-black" />
              <h2 className="text-lg font-bold text-gray-900">Prazos Próximos ({prazos.length})</h2>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-600">Tipo</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Descrição</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Data</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Dias</th>
                </tr>
              </thead>
              <tbody>
                {prazos.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2">{p.tipo ?? '—'}</td>
                    <td className="py-2">{p.descricao ?? '—'}</td>
                    <td className="py-2">{p.data_prazo ? fmtDate(p.data_prazo) : '—'}</td>
                    <td className="py-2 font-bold" style={{ color: (p.dias_restantes ?? 999) <= 5 ? '#dc2626' : '#059669' }}>
                      {p.dias_restantes ?? '—'}d
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Honorários */}
        {honorarios.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-gray-700 print:text-black" />
              <h2 className="text-lg font-bold text-gray-900">Honorários</h2>
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-2 font-semibold text-gray-600">Tipo</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Acordado</th>
                  <th className="text-right py-2 font-semibold text-gray-600">Recebido</th>
                  <th className="text-left py-2 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {honorarios.map((h, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2">{h.tipo ?? '—'}</td>
                    <td className="py-2 text-right">{fmtBRL(h.valor_total_acordado ?? 0)}</td>
                    <td className="py-2 text-right">{fmtBRL(h.valor_recebido ?? 0)}</td>
                    <td className="py-2 capitalize">{h.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Conversation Summary */}
        {conversationSummary && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-gray-700 print:text-black" />
              <h2 className="text-lg font-bold text-gray-900">Resumo da Conversa</h2>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap print:bg-transparent print:border print:border-gray-200">
              {conversationSummary}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-400">
          <p>Documento gerado automaticamente pelo Jurify em {new Date().toLocaleString('pt-BR')}</p>
          <p className="mt-1">Este documento é confidencial e destinado apenas ao cliente identificado.</p>
        </div>
      </div>
    </div>
  );
});

LeadReport.displayName = 'LeadReport';

export default LeadReport;
