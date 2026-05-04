import { Clock, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WindowStatus } from '@/hooks/useWhatsAppWindow';

interface WindowStatusBadgeProps {
  status: WindowStatus;
  formattedRemaining: string;
  className?: string;
}

const WindowStatusBadge = ({ status, formattedRemaining, className }: WindowStatusBadgeProps) => {
  const isOpen = status.is_open;
  const noInbound = status.reason === 'no_inbound_yet';

  const getTooltipContent = () => {
    if (noInbound) {
      return 'Cliente ainda não enviou mensagem. Use template aprovado para iniciar contato.';
    }
    if (isOpen) {
      return `Janela WhatsApp aberta — você pode enviar texto livre por mais ${formattedRemaining}. Após esse período, só templates aprovados.`;
    }
    return 'Janela 24h fechada. Cliente não envia mensagem há mais de 24h. Para reabrir, envie um template aprovado pela Meta.';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={isOpen ? 'default' : 'destructive'}
            className={`gap-1.5 cursor-help ${isOpen ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15' : ''} ${className ?? ''}`}
          >
            {isOpen ? (
              <>
                <Clock className="h-3 w-3" />
                <span className="font-medium">Janela: {formattedRemaining}</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
                <span className="font-medium">{noInbound ? 'Sem inbound' : 'Fechada — use template'}</span>
              </>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-sm">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WindowStatusBadge;
