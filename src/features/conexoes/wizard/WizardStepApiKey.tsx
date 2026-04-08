import { Loader2, AlertTriangle, Shield, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WizardStepApiKeyProps {
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  savingKey: boolean;
  keyError: string | null;
  onClearKeyError: () => void;
  onSaveKey: () => void;
}

const WizardStepApiKey = ({
  apiKey,
  onApiKeyChange,
  savingKey,
  keyError,
  onClearKeyError,
  onSaveKey,
}: WizardStepApiKeyProps) => {
  return (
    <div className="flex-1 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
        <Key className="h-10 w-10 text-blue-600" />
      </div>

      <h2 className="text-xl font-semibold mb-2">Configure sua conta Kapso</h2>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        O Jurify usa a Kapso como motor do WhatsApp. Crie sua conta gratuita e cole a API key abaixo.
      </p>

      <div className="w-full max-w-sm space-y-4 text-left mb-6">
        <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
          <p className="text-sm font-medium">Como obter sua API key:</p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
            <li>Acesse <a href="https://app.kapso.ai" target="_blank" rel="noopener noreferrer"
              className="text-primary underline hover:no-underline">app.kapso.ai</a> e crie sua conta (grátis)</li>
            <li>Vá em <strong>Settings → API Keys</strong></li>
            <li>Copie sua API key e cole abaixo</li>
          </ol>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kapso-key" className="text-sm font-medium">API Key da Kapso</Label>
          <Input
            id="kapso-key"
            type="password"
            value={apiKey}
            onChange={(e) => { onApiKeyChange(e.target.value); onClearKeyError(); }}
            placeholder="kps_..."
            className="font-mono text-sm"
          />
        </div>

        {keyError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{keyError}</p>
            </div>
          </div>
        )}
      </div>

      <Button
        size="lg"
        className="w-full max-w-sm"
        onClick={onSaveKey}
        disabled={savingKey || !apiKey.trim()}
      >
        {savingKey ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validando...</>
        ) : (
          <>Salvar e Continuar</>
        )}
      </Button>

      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <Shield className="h-3.5 w-3.5" />
        <span>Sua API key é armazenada com segurança e usada apenas para este escritório.</span>
      </div>
    </div>
  );
};

export default WizardStepApiKey;
