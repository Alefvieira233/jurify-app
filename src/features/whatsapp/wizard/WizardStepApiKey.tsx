import { useState } from 'react';
import { ChevronDown, AlertTriangle, Shield, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
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

/**
 * FALLBACK STEP — só aparece se KAPSO_MASTER_API_KEY não estiver configurado
 * no Supabase Edge Secrets. No fluxo padrão (Partner Mode), este step nunca é
 * exibido — o wizard salta direto para 'prepare'.
 *
 * Este componente prioriza UX clara: avisa que o WhatsApp está em manutenção
 * e oferece o input legado como fallback técnico colapsado.
 */
const WizardStepApiKey = ({
  apiKey,
  onApiKeyChange,
  savingKey,
  keyError,
  onClearKeyError,
  onSaveKey,
}: WizardStepApiKeyProps) => {
  const [showLegacyInput, setShowLegacyInput] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
        <MessageSquare className="h-10 w-10 text-amber-600" />
      </div>

      <h2 className="text-xl font-semibold mb-2">WhatsApp temporariamente indisponível</h2>
      <p className="text-sm text-muted-foreground mb-8 max-w-sm">
        A integração WhatsApp do Jurify está sendo reativada. Volte em alguns minutos
        ou fale com o suporte se a indisponibilidade persistir.
      </p>

      <div className="w-full max-w-sm mb-6 p-4 rounded-lg bg-muted/40 border text-left text-sm">
        <p className="font-medium mb-1">Por que isso aparece?</p>
        <p className="text-muted-foreground">
          Estamos finalizando a configuração do servidor WhatsApp. Não é necessário
          fazer nada do seu lado — o serviço deve voltar em instantes.
        </p>
      </div>

      <Button asChild size="lg" className="w-full max-w-sm mb-3">
        <a
          href={`https://wa.me/${import.meta.env.VITE_SALES_WHATSAPP || '5596981419460'}?text=${encodeURIComponent('Olá, o Jurify mostra que o WhatsApp está indisponível.')}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Falar com o suporte
        </a>
      </Button>

      {/* Legacy fallback (colapsado) — só pra suporte avançado */}
      <button
        type="button"
        onClick={() => setShowLegacyInput((s) => !s)}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-2"
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${showLegacyInput ? 'rotate-180' : ''}`} />
        Modo avançado: usar minha própria conta Kapso
      </button>

      {showLegacyInput && (
        <div className="w-full max-w-sm space-y-3 text-left mt-4 p-4 rounded-lg border bg-card">
          <div className="text-xs text-muted-foreground">
            Este modo é apenas para tenants que possuem conta Kapso própria. No fluxo
            padrão, o Jurify gerencia tudo automaticamente — você não precisa fazer isso.
          </div>
          <div className="space-y-2">
            <Label htmlFor="kapso-key" className="text-sm font-medium">API Key da Kapso (opcional)</Label>
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
          <Button
            size="sm"
            className="w-full"
            onClick={onSaveKey}
            disabled={savingKey || !apiKey.trim()}
          >
            {savingKey ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Validando...</>
            ) : (
              <>Salvar e usar conta própria</>
            )}
          </Button>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>API key armazenada criptografada (AES-256-GCM).</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WizardStepApiKey;
