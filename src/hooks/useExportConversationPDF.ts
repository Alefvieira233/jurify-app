import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { WhatsAppConversation, WhatsAppMessage } from '@/hooks/useWhatsAppConversations';
import { createLogger } from '@/lib/logger';

const log = createLogger('useExportConversationPDF');

interface ExportOptions {
  /** Nome do escritório que aparece no cabeçalho do PDF */
  officeName?: string;
  /** Se true, inclui mensagens da IA marcadas como tal. Default: true */
  includeAI?: boolean;
}

function senderLabel(sender: string): string {
  switch (sender) {
    case 'lead':
    case 'user':
    case 'cliente':
      return 'Cliente';
    case 'ia':
    case 'agent':
      return 'IA Jurídica';
    case 'agente':
      return 'Atendente';
    default:
      return sender || 'Sistema';
  }
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 13) return `+${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,9)}-${digits.slice(9)}`;
  if (digits.length === 12) return `+${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,8)}-${digits.slice(8)}`;
  return phone;
}

/**
 * Hook para exportar conversa WhatsApp em PDF profissional. Útil para:
 * - Anexar como prova em processo judicial
 * - Arquivamento LGPD
 * - Compartilhar transcrição com cliente
 */
export function useExportConversationPDF() {
  const { toast } = useToast();

  const exportPDF = useCallback(async (
    conversation: WhatsAppConversation,
    messages: WhatsAppMessage[],
    options: ExportOptions = {},
  ) => {
    const { officeName = 'Jurify', includeAI = true } = options;

    try {
      // Lazy load jspdf — heavy lib, only loaded when actually exporting
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      // jspdf-autotable injects itself or returns default
      const autoTable = (autoTableMod as { default?: unknown }).default ?? autoTableMod;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let y = margin;

      // ── HEADER ──
      doc.setFillColor(16, 24, 40);
      doc.rect(0, 0, pageWidth, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(officeName, margin, 10);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Transcrição de Conversa WhatsApp', margin, 16);

      doc.setTextColor(40, 40, 40);
      y = 30;

      // ── METADADOS ──
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Dados da conversa', margin, y);
      y += 6;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const meta: Array<[string, string]> = [
        ['Contato', conversation.contact_name || formatPhone(conversation.phone_number)],
        ['Telefone', formatPhone(conversation.phone_number)],
        ['Status', conversation.status || '—'],
        ['Área jurídica', conversation.area_juridica || '—'],
        ['Total de mensagens', String(messages.length)],
        ['Exportado em', formatTimestamp(new Date().toISOString())],
      ];
      for (const [k, v] of meta) {
        doc.setFont('helvetica', 'bold'); doc.text(`${k}: `, margin, y);
        doc.setFont('helvetica', 'normal'); doc.text(v, margin + 35, y);
        y += 5;
      }
      y += 4;

      // ── TABELA DE MENSAGENS ──
      const filteredMessages = includeAI ? messages : messages.filter(m => m.sender !== 'ia');

      const tableBody = filteredMessages.map(m => [
        formatTimestamp(m.timestamp),
        senderLabel(m.sender),
        m.content || (m.message_type ? `[${m.message_type}]` : '—'),
      ]);

      const autoTableFn = autoTable as (doc: unknown, opts: unknown) => void;
      autoTableFn(doc, {
        startY: y,
        head: [['Data/Hora', 'Remetente', 'Conteúdo']],
        body: tableBody,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2.5, valign: 'top' },
        headStyles: { fillColor: [16, 24, 40], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 32 },
          1: { cellWidth: 28 },
          2: { cellWidth: 'auto' },
        },
        didDrawCell: (data: { row: { raw: unknown }; column: { index: number }; cell: { x: number; y: number; height: number; width: number } }) => {
          // Color sender column
          if (data.column.index === 1) {
            const sender = (data.row.raw as string[])[1];
            if (sender === 'Cliente') {
              doc.setDrawColor(0, 150, 136);
              doc.setLineWidth(0.5);
              doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            } else if (sender === 'IA Jurídica') {
              doc.setDrawColor(99, 102, 241);
              doc.setLineWidth(0.5);
              doc.line(data.cell.x, data.cell.y, data.cell.x, data.cell.y + data.cell.height);
            }
          }
        },
        didDrawPage: (data: { pageNumber: number }) => {
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(
            `Página ${data.pageNumber}  ·  Gerado por ${officeName} via Jurify`,
            margin, pageHeight - 8,
          );
          doc.text(
            'Documento confidencial. Uso restrito ao processo correlato.',
            pageWidth - margin, pageHeight - 8,
            { align: 'right' },
          );
        },
        margin: { left: margin, right: margin, bottom: 15 },
      });

      const filename = `conversa_whatsapp_${(conversation.contact_name || conversation.phone_number || 'cliente').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      toast({
        title: 'PDF exportado',
        description: `${filteredMessages.length} mensagens em ${filename}`,
      });
    } catch (err) {
      log.error('export PDF failed', err);
      toast({
        title: 'Erro ao exportar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return { exportPDF };
}
