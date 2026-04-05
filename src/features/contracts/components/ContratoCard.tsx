import { memo } from 'react';
import { Eye, Edit, FileSignature, Send, Share2, Trash2 } from 'lucide-react';
import { nativeShare } from '@/hooks/useNativeShare';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Contrato } from '@/hooks/useContratos';
import { fmtCurrency, fmtDate } from '@/utils/formatting';

export interface ContratoCardProps {
  contrato: Contrato;
  onOpenDetails: (contrato: Contrato) => void;
  onDelete: (contrato: Contrato) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

const ContratoCard = memo(({ contrato, onOpenDetails, onDelete, getStatusColor, getStatusLabel }: ContratoCardProps) => (
  <Card className="group border-border/10 bg-background/40 hover:bg-card hover:shadow-sm hover:border-border/30 transition-all duration-300 backdrop-blur-sm rounded-[12px]">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
              {contrato.nome_cliente}
            </h3>
            <Badge className={getStatusColor(contrato.status ?? '')}>
              {getStatusLabel(contrato.status ?? '')}
            </Badge>
            {contrato.status_assinatura && (
              <Badge variant="outline">
                {contrato.status_assinatura}
              </Badge>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4 text-sm text-[hsl(var(--muted-foreground))]">
            <div>
              <span className="font-medium">Area Juridica:</span> {contrato.area_juridica}
            </div>
            <div>
              <span className="font-medium">Responsavel:</span> {contrato.responsavel}
            </div>
            <div>
              <span className="font-medium">Valor da Causa:</span> {fmtCurrency(Number(contrato.valor_causa))}
            </div>
            {contrato.data_envio && (
              <div>
                <span className="font-medium">Data de Envio:</span> {fmtDate(contrato.data_envio)}
              </div>
            )}
            {contrato.data_assinatura && (
              <div>
                <span className="font-medium">Data de Assinatura:</span> {fmtDate(contrato.data_assinatura)}
              </div>
            )}
          </div>

          {contrato.observacoes && (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              <span className="font-medium">Observacoes:</span> {contrato.observacoes}
            </div>
          )}

          <div className="text-xs text-[hsl(var(--muted-foreground))]">
            Criado em: {fmtDate(contrato.created_at)}
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="sm" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]" onClick={() => onOpenDetails(contrato)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]" onClick={() => onOpenDetails(contrato)}>
            <Edit className="h-4 w-4" />
          </Button>
          {contrato.status === 'rascunho' && (
            <Button variant="outline" size="sm" className="text-blue-300 hover:text-blue-200" onClick={() => onOpenDetails(contrato)}>
              <Send className="h-4 w-4" />
            </Button>
          )}
          {contrato.link_assinatura_zapsign && (
            <Button variant="outline" size="sm" className="text-emerald-200 hover:text-emerald-100" onClick={() => onOpenDetails(contrato)}>
              <FileSignature className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => {
              void nativeShare({
                title: `Contrato \u2014 ${contrato.nome_cliente ?? ''}`,
                text: `Contrato Jurify\nCliente: ${contrato.nome_cliente ?? ''}\nStatus: ${contrato.status ?? ''}\nValor: ${contrato.valor_causa ? `R$ ${contrato.valor_causa}` : 'A definir'}`,
                dialogTitle: 'Compartilhar contrato',
              });
            }}
            aria-label="Compartilhar contrato"
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(contrato)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
));
ContratoCard.displayName = 'ContratoCard';

export default ContratoCard;
