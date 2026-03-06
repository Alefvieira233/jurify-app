import React from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

// Global handler: catch unhandled promise rejections (async errors outside try-catch)
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason instanceof Error
    ? event.reason
    : new Error(String(event.reason ?? 'Unhandled promise rejection'));
  Sentry.captureException(error, { tags: { handler: 'unhandledrejection' } });
});

// Global handler: catch uncaught errors not caught by ErrorBoundary
window.addEventListener('error', (event) => {
  if (event.error) {
    Sentry.captureException(event.error, { tags: { handler: 'window.onerror' } });
  }
});

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
