/**
 * Export helpers for reports.
 *
 * Supports CSV (native, BOM UTF-8 — Excel abre nativamente) e PDF
 * (jspdf + jspdf-autotable — lazy loaded). XLSX foi removido em
 * 2026-04-17 porque a lib `xlsx` tem CVE critical (GHSA-4r6h-8v6p-xvw6)
 * sem fix upstream. Usuários que quiserem .xlsx devem exportar CSV e
 * salvar como Excel — zero perda de dados, zero vulnerabilidade.
 *
 * Each export function accepts a consistent shape:
 *   { headers: string[]; rows: Array<Array<string | number>>; title?: string }
 *
 * All exports respect filters applied upstream — callers must pass already
 * filtered data, no tenant/data access happens inside this hook.
 */
import { useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import { toUserMessage } from '@/lib/errorMessages';

const log = createLogger('useReportExport');

export interface ExportData {
  headers: string[];
  rows: Array<Array<string | number>>;
  title?: string;
}

export type ExportFormat = 'csv' | 'pdf';

const DATE_STAMP = () => new Date().toISOString().slice(0, 10);

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const escCsv = (v: string | number | undefined | null): string =>
  `"${String(v ?? '').replace(/"/g, '""')}"`;

const buildCsv = ({ headers, rows }: ExportData): string =>
  [headers.map(escCsv).join(','), ...rows.map((r) => r.map(escCsv).join(','))].join('\n');

export function useReportExport() {
  const { toast } = useToast();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const exportCSV = useCallback(
    (data: ExportData, filename?: string): Promise<void> => {
      if (!data.rows.length) {
        toast({ title: 'Nada para exportar', description: 'Não há dados no filtro atual.' });
        return Promise.resolve();
      }
      setExporting('csv');
      try {
        // Prepend UTF-8 BOM so Excel opens accented chars correctly.
        const blob = new Blob(['\uFEFF', buildCsv(data)], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, filename ?? `relatorio-${DATE_STAMP()}.csv`);
        toast({ title: 'Exportado', description: 'CSV gerado com sucesso.' });
      } catch (err) {
        log.error('exportCSV failed', err);
        toast({ title: 'Erro ao exportar CSV', description: toUserMessage(err), variant: 'destructive' });
      } finally {
        setExporting(null);
      }
      return Promise.resolve();
    },
    [toast],
  );

  const exportPDF = useCallback(
    async (data: ExportData, filename?: string): Promise<void> => {
      if (!data.rows.length) {
        toast({ title: 'Nada para exportar', description: 'Não há dados no filtro atual.' });
        return;
      }
      setExporting('pdf');
      try {
        // Dynamic import keeps ~350 KB out of the main bundle.
        const [{ default: jsPDF }, autoTableMod] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
        ]);
        const autoTable = (autoTableMod as { default: (doc: unknown, opts: unknown) => void }).default;

        const doc = new jsPDF({ orientation: 'landscape' });
        if (data.title) {
          doc.setFontSize(14);
          doc.text(data.title, 14, 16);
        }
        autoTable(doc, {
          head: [data.headers],
          body: data.rows.map((r) => r.map((c) => String(c ?? ''))),
          startY: data.title ? 22 : 14,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] },
        });
        doc.save(filename ?? `relatorio-${DATE_STAMP()}.pdf`);
        toast({ title: 'Exportado', description: 'PDF gerado com sucesso.' });
      } catch (err) {
        log.error('exportPDF failed', err);
        toast({
          title: 'Erro ao exportar PDF',
          description: toUserMessage(err),
          variant: 'destructive',
        });
      } finally {
        setExporting(null);
      }
    },
    [toast],
  );

  return { exportCSV, exportPDF, exporting };
}
