import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'
import { initSentry } from './lib/sentry'

// 🚀 INIT SENTRY (Elon Musk/xAI Standard: Observability First)
initSentry();

// 🚀 PADRÃO ELON MUSK: Error Boundary global para prevenir crashes completos
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('🚨 FALHA CRÍTICA: Root element não encontrado. Sistema não pode inicializar.');
}

// 🚀 TESLA/SPACEX GRADE: Sistema nunca deve crashar completamente
createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
