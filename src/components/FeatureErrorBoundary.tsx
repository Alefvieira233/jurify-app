/**
 * Feature-scoped error boundary.
 *
 * Catches render errors within a single feature route so the rest of the
 * application (sidebar, header) stays intact.  Reports to Sentry with
 * feature-level context for faster triage.
 *
 * @module FeatureErrorBoundary
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureException } from '@sentry/react';
import { createLogger } from '@/lib/logger';

const log = createLogger('FeatureErrorBoundary');

interface Props {
  /** Human-readable feature name shown in the fallback UI. */
  feature: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error(`Erro em "${this.props.feature}"`, {
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ error, errorInfo });

    captureException(error, {
      contexts: {
        react: { componentStack: errorInfo.componentStack },
        feature: { name: this.props.feature },
      },
      tags: {
        errorBoundary: 'feature',
        feature: this.props.feature,
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 w-full" role="alert">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">
                Erro em {this.props.feature}
              </h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
                Ocorreu um erro inesperado nesta secao. O restante do sistema continua funcionando.
              </p>

              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Recarregar secao
              </Button>

              {import.meta.env.MODE === 'development' && this.state.error && (
                <details className="mt-5 text-left">
                  <summary className="cursor-pointer text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                    Detalhes do erro
                  </summary>
                  <pre className="mt-2 text-xs bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-2 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;
