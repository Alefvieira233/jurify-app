export type WizardStep = 'api-key' | 'prepare' | 'connecting' | 'syncing' | 'connected';
export type SetupState = 'idle' | 'loading' | 'ready' | 'error';

export const SYNC_STEPS = [
  'Conta verificada',
  'Número confirmado',
  'Configurando atendimento automático',
  'Pronto!',
] as const;
