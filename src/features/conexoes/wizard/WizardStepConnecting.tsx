import { ArrowLeft, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardStepConnectingProps {
  popupOpen: boolean;
  setupUrl: string | null;
  onFinished: () => void;
  onReopen: () => void;
  onBack: () => void;
}

const WizardStepConnecting = ({
  popupOpen,
  setupUrl,
  onFinished,
  onReopen,
  onBack,
}: WizardStepConnectingProps) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
        <ExternalLink className="h-10 w-10 text-amber-600" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Aguardando conexão...</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        Complete a autenticação na janela que foi aberta. Quando terminar, volte aqui.
      </p>
      {popupOpen && (
        <div className="flex items-center gap-2 mb-6">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Verificando conexão automaticamente...</span>
        </div>
      )}
      <div className="w-full max-w-sm space-y-2">
        <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={onFinished}>
          <CheckCircle2 className="h-4 w-4 mr-2" /> Já finalizei a conexão
        </Button>
        <Button variant="outline" size="lg" className="w-full"
          onClick={() => { if (setupUrl) onReopen(); }}>
          <ExternalLink className="h-4 w-4 mr-2" /> Abrir novamente
        </Button>
        <Button variant="ghost" size="sm" className="w-full mt-2" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Voltar
        </Button>
      </div>
    </div>
  );
};

export default WizardStepConnecting;
