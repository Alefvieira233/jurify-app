import { useNavigate } from 'react-router-dom';
import { CheckCircle2, MessageSquare } from 'lucide-react';
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
      <div className="w-full max-w-sm text-left space-y-2 mb-8 p-4 rounded-lg bg-muted/30 border">
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
