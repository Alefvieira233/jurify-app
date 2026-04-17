/**
 * Onboarding steps barrel.
 *
 * The legacy 4 steps (Welcome/WhatsApp/Agents/Done) live in ../steps.tsx for
 * now to keep diff/test history clean — they are re-exported here alongside
 * the new Onda 2 steps (Escritorio, Equipe, Plano).
 */

export {
  WelcomeStep,
  WhatsAppStep,
  AgentsStep,
  DoneStep,
} from '../steps';
export { default as EscritorioStep } from './EscritorioStep';
export { default as EquipeStep } from './EquipeStep';
export { default as PlanoStep } from './PlanoStep';
