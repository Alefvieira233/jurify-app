
import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import * as Sentry from '@sentry/react';
import { createLogger } from '@/lib/logger';
import { Translation } from 'react-i18next';

const log = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    log.error('Erro capturado', { error: error.message, componentStack: errorInfo.componentStack });

    this.setState({
      error,
      errorInfo
    });

    // ✅ Enviar erro para Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: true,
      },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Translation>
          {(t) => (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[hsl(var(--background))]">
              <Card className="w-full max-w-md" role="alert">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                    {t('errors.somethingWentWrong')}
                  </h2>
                  <p className="text-[hsl(var(--muted-foreground))] mb-6">
                    {t('errors.unexpectedError')}
                  </p>

                  <div className="space-y-3">
                    <Button
                      onClick={this.handleReset}
                      className="w-full bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('common.tryAgain')}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={this.handleReload}
                      className="w-full bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                    >
                      {t('errors.reloadPage')}
                    </Button>
                  </div>

                  {import.meta.env.MODE === 'development' && this.state.error && (
                    <details className="mt-6 text-left">
                      <summary className="cursor-pointer text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                        {t('errors.errorDetails')}
                      </summary>
                      <pre className="mt-2 text-xs bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-2 rounded overflow-auto max-h-32">
                        {this.state.error.toString()}
                        {this.state.errorInfo?.componentStack}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

