/**
 * 🛡️ WHATSAPP ERROR BOUNDARY
 *
 * Captura erros de renderização do componente WhatsApp
 * e exibe interface amigável em vez de tela branca.
 *
 * @version 1.0.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class WhatsAppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ [WhatsApp ErrorBoundary] Erro capturado:', error);
    console.error('Stack trace:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">WhatsApp IA Jurídica</h1>
            <p className="text-[hsl(var(--muted-foreground))]">Atendimento inteligente 24/7 para leads jurídicos</p>
          </div>

          <Card className="border-red-500/30 bg-red-500/10 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="h-16 w-16 text-red-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
                  Ops! Algo deu errado
                </h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-6">
                  Ocorreu um erro ao carregar o módulo WhatsApp.
                </p>

                {/* Error Details (apenas dev) */}
                {import.meta.env.MODE === 'development' && this.state.error && (
                  <div className="mb-6 p-4 bg-red-500/10 border border-red-500/25 rounded-lg text-left">
                    <p className="font-mono text-xs text-[hsl(var(--foreground))] break-all">
                      <strong>Erro:</strong> {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-red-200 hover:text-[hsl(var(--foreground))]">
                          Ver stack trace
                        </summary>
                        <pre className="mt-2 text-xs text-red-200 overflow-auto max-h-48">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={this.handleReset}
                    className="bg-red-500/15 text-red-200 border border-red-400/30 hover:bg-red-500/25"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar Página
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Voltar ao Início
                  </Button>
                </div>

                {/* Troubleshooting */}
                <div className="mt-8 text-left bg-[hsl(var(--card))] rounded-lg p-4">
                  <h4 className="font-semibold text-[hsl(var(--foreground))] mb-2">
                    💡 Possíveis soluções:
                  </h4>
                  <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-1 list-disc list-inside">
                    <li>Verifique se a tabela <code className="bg-[hsl(var(--muted))] border border-[hsl(var(--border))] px-1 rounded">whatsapp_conversations</code> existe no Supabase</li>
                    <li>Confirme se as credenciais do Supabase estão corretas no arquivo .env</li>
                    <li>Verifique o console do navegador (F12) para mais detalhes</li>
                    <li>Tente fazer logout e login novamente</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

