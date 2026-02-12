
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, XCircle, AlertTriangle, MessageSquare, ExternalLink, Download } from 'lucide-react';
import { useZapSignIntegration } from '@/hooks/useZapSignIntegration';

interface StatusAssinaturaProps {
  contrato: {
    id: string;
    nome_cliente: string;
    status_assinatura?: string;
    link_assinatura_zapsign?: string;
    data_geracao_link?: string;
    data_envio_whatsapp?: string;
    data_assinatura?: string;
    telefone?: string;
  };
  leadTelefone?: string;
  onStatusUpdate?: () => void;
}

export const StatusAssinatura = ({ contrato, leadTelefone, onStatusUpdate }: StatusAssinaturaProps) => {
  const { isLoading, verificarStatusAssinatura, enviarViaWhatsApp } = useZapSignIntegration();

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'assinado':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-200 border border-emerald-400/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Assinado
          </Badge>
        );
      case 'pendente':
        return (
          <Badge className="bg-amber-500/15 text-amber-200 border border-amber-400/30">
            <Clock className="h-3 w-3 mr-1" />
            Pendente
          </Badge>
        );
      case 'cancelado':
        return (
          <Badge className="bg-red-500/15 text-red-200 border border-red-400/30">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelado
          </Badge>
        );
      case 'expirado':
        return (
          <Badge className="bg-slate-500/15 text-slate-200 border border-slate-400/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expirado
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-500/15 text-slate-200 border border-slate-400/30">
            <Clock className="h-3 w-3 mr-1" />
            Não iniciado
          </Badge>
        );
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleVerificarStatus = async () => {
    await verificarStatusAssinatura(contrato.id);
    if (onStatusUpdate) onStatusUpdate();
  };

  const handleEnviarWhatsApp = async () => {
    const telefone = contrato.telefone || leadTelefone;
    if (!telefone || !contrato.link_assinatura_zapsign) {
      return;
    }

    const sucesso = await enviarViaWhatsApp(
      contrato.id,
      telefone,
      contrato.nome_cliente,
      contrato.link_assinatura_zapsign
    );

    if (sucesso && onStatusUpdate) {
      onStatusUpdate();
    }
  };

  const handleAbrirLink = () => {
    if (contrato.link_assinatura_zapsign) {
      window.open(contrato.link_assinatura_zapsign, '_blank');
    }
  };

  const handleDownloadPDF = () => {
    // Implementar download do PDF assinado
    console.log('Download PDF - Função será implementada');
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-[hsl(var(--surface-1))]">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Status de Assinatura Digital</h4>
        {getStatusBadge(contrato.status_assinatura)}
      </div>

      {contrato.link_assinatura_zapsign && (
        <div className="space-y-3">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            <p><strong>Link gerado:</strong> {formatDate(contrato.data_geracao_link)}</p>
            {contrato.data_envio_whatsapp && (
              <p><strong>Enviado via WhatsApp:</strong> {formatDate(contrato.data_envio_whatsapp)}</p>
            )}
            {contrato.data_assinatura && (
              <p><strong>Data da assinatura:</strong> {formatDate(contrato.data_assinatura)}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
              size="sm"
              onClick={() => { void handleVerificarStatus(); }}
              disabled={isLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Verificar Status
            </Button>

            <Button
              variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
              size="sm"
              onClick={handleAbrirLink}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Link
            </Button>

            {(contrato.telefone || leadTelefone) && contrato.status_assinatura !== 'assinado' && (
              <Button
                variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                size="sm"
                onClick={() => { void handleEnviarWhatsApp(); }}
                disabled={isLoading}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Enviar WhatsApp
              </Button>
            )}

            {contrato.status_assinatura === 'assinado' && (
              <Button
                variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                size="sm"
                onClick={handleDownloadPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

