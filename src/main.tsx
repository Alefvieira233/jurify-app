import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

// Sentry is initialized in App.tsx via initSentry()
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element not found. Application cannot initialize.');
}

const isDev = import.meta.env.DEV;

const app = (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

createRoot(rootElement).render(
  isDev ? <React.StrictMode>{app}</React.StrictMode> : app
);
