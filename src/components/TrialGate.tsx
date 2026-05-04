import { useState, type ReactNode, type ComponentProps } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription, type TrialRestrictions } from '@/hooks/useSubscription';

interface TrialGateProps {
  action: keyof TrialRestrictions;
  children: ReactNode;
  /** Mensagem custom para o paywall. Se omitir, usa default por ação. */
  message?: string;
  /** Se true, esconde o trigger inteiro quando bloqueado (em vez de mostrar modal). */
  hideWhenBlocked?: boolean;
}

const ACTION_MESSAGES: Record<keyof TrialRestrictions, string> = {
  create_lead: 'Crie leads ilimitados — assine para continuar capturando oportunidades.',
  edit_lead: 'Edite e qualifique leads — assine para continuar.',
  create_processo: 'Cadastre processos ilimitados com sincronização automática.',
  edit_processo: 'Edição de processos disponível em planos pagos.',
  create_contrato: 'Gere contratos com IA — assine para desbloquear.',
  edit_contrato: 'Edição de contratos disponível em planos pagos.',
  send_whatsapp: 'Responda no WhatsApp e ative a IA — assine para continuar atendendo.',
  ai_responder: 'IA responde clientes 24/7 — assine para reativar.',
  create_agendamento: 'Crie agendamentos integrados ao Google Calendar.',
  create_documento: 'Faça upload e gestão de documentos jurídicos.',
  view_data: '',
  receive_whatsapp: '',
};

const TrialGate = ({ action, children, message, hideWhenBlocked = false }: TrialGateProps) => {
  const { can, isExpired, isLoading } = useSubscription();
  const [open, setOpen] = useState(false);

  if (isLoading) return <>{children}</>;
  if (can(action)) return <>{children}</>;
  if (hideWhenBlocked) return null;

  const finalMessage = message || ACTION_MESSAGES[action] || 'Recurso disponível em planos pagos.';

  type WithOnClick = { onClick?: ComponentProps<'button'>['onClick'] };
  const child = children as React.ReactElement<WithOnClick>;
  const trigger = (
    <span
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOpen(true);
      }}
      className="inline-block"
    >
      {child}
    </span>
  );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              {isExpired ? <Lock className="h-6 w-6 text-primary" /> : <Sparkles className="h-6 w-6 text-primary" />}
            </div>
            <DialogTitle className="text-center">
              {isExpired ? 'Trial expirado' : 'Recurso indisponível'}
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              {finalMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button asChild className="w-full">
              <Link to="/pricing">Ver planos e assinar</Link>
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} className="w-full">
              Voltar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialGate;
