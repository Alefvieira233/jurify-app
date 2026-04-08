import { ArrowLeft } from 'lucide-react';
import { useWhatsAppWizard } from './wizard/useWhatsAppWizard';
import WizardProgressBar from './wizard/WizardProgressBar';
import WizardStepApiKey from './wizard/WizardStepApiKey';
import WizardStepPrepare from './wizard/WizardStepPrepare';
import WizardStepConnecting from './wizard/WizardStepConnecting';
import WizardStepSyncing from './wizard/WizardStepSyncing';
import WizardStepConnected from './wizard/WizardStepConnected';

interface WhatsAppWizardProps {
  onClose: () => void;
  onConnected: () => void;
}

const WhatsAppWizard = ({ onClose, onConnected }: WhatsAppWizardProps) => {
  const {
    step,
    setupState,
    setupUrl,
    errorMsg,
    syncStep,
    popupOpen,
    apiKey,
    setApiKey,
    savingKey,
    keyError,
    setKeyError,
    handleSaveKey,
    handleConnect,
    handleFinished,
    handleBackFromConnecting,
    handleReopenSetupUrl,
    generateSetupLink,
  } = useWhatsAppWizard(onConnected);

  return (
    <div className="flex flex-col h-full">
      {step !== 'connected' && step !== 'syncing' && (
        <button type="button" onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}

      <WizardProgressBar step={step} />

      {step === 'api-key' && (
        <WizardStepApiKey
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          savingKey={savingKey}
          keyError={keyError}
          onClearKeyError={() => setKeyError(null)}
          onSaveKey={() => { void handleSaveKey(); }}
        />
      )}

      {step === 'prepare' && (
        <WizardStepPrepare
          setupState={setupState}
          errorMsg={errorMsg}
          onConnect={handleConnect}
          onRetry={() => { void generateSetupLink(); }}
        />
      )}

      {step === 'connecting' && (
        <WizardStepConnecting
          popupOpen={popupOpen}
          setupUrl={setupUrl}
          onFinished={handleFinished}
          onReopen={handleReopenSetupUrl}
          onBack={handleBackFromConnecting}
        />
      )}

      {step === 'syncing' && (
        <WizardStepSyncing syncStep={syncStep} />
      )}

      {step === 'connected' && (
        <WizardStepConnected onClose={onClose} />
      )}
    </div>
  );
};

export default WhatsAppWizard;
