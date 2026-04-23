import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardStepConnectedProps {
  onClose: () => void;
}

const WizardStepConnected = ({ onClose }: WizardStepConnectedProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
        <CheckCircle2 className="h-9 w-9 text-green-500" />
      </div>
      <h2 className="text-xl font-semibold mb-2">WhatsApp conectado!</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Seu número está pronto para receber mensagens.
      </p>

      {/* Manual test instructions — most reliable way to verify webhook is live. */}
      <div className="w-full max-w-sm text-left space-y-2 mb-4 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2 mb-2">
          <Send className="h-4 w-4 text-blue-600" />
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Teste rápido (1 minuto)</p>
        </div>
        <ol className="text-xs text-blue-900/80 dark:text-blue-200/80 space-y-1.5 list-decimal list-inside pl-1">
          <li>Pegue outro celular (ou peça para alguém)</li>
          <li>Envie uma mensagem para o seu número conectado</li>
          <li>Ela deve aparecer em &quot;Conversas&quot; em até 10 segundos</li>
          <li>Se a IA estiver ativa, ela responde automaticamente</li>
        </ol>
      </div>

      <div className="w-full max-w-sm text-left space-y-2 mb-6 p-4 rounded-lg bg-muted/30 border">
        <p className="text-sm font-medium mb-3">O que acontece agora:</p>
        {['Mensagens dos clientes chegam aqui no Jurify',
          'A IA responde automaticamente fora do horário',
          'Leads são criados para cada novo contato',
        ].map((text) => (
          <div key={text} className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <div className="w-full max-w-sm space-y-2">
        <Button size="lg" className="w-full bg-green-600 hover:bg-green-700"
          onClick={() => navigate('/whatsapp')}>
          <MessageSquare className="h-4 w-4 mr-2" /> Ir para Conversas
        </Button>
        <Button variant="outline" size="lg" className="w-full" onClick={onClose}>Fechar</Button>
      </div>
    </div>
  );
};

export default WizardStepConnected;
