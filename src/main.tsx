import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

// Sentry is initialized in App.tsx via initSentry()
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
