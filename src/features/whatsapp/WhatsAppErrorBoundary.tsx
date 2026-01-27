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
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp IA Jurídica</h1>
            <p className="text-gray-600">Atendimento inteligente 24/7 para leads jurídicos</p>
          </div>

          <Card className="border-red-200 bg-red-50 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-900 mb-2">
                  Ops! Algo deu errado
                </h3>
                <p className="text-red-700 mb-6">
                  Ocorreu um erro ao carregar o módulo WhatsApp.
                </p>

                {/* Error Details (apenas dev) */}
                {import.meta.env.MODE === 'development' && this.state.error && (
                  <div className="mb-6 p-4 bg-red-100 rounded-lg text-left">
                    <p className="font-mono text-xs text-red-900 break-all">
                      <strong>Erro:</strong> {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-red-800 hover:text-red-900">
                          Ver stack trace
                        </summary>
                        <pre className="mt-2 text-xs text-red-800 overflow-auto max-h-48">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={this.handleReset}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar Página
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Voltar ao Início
                  </Button>
                </div>

                {/* Troubleshooting */}
                <div className="mt-8 text-left bg-white rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    💡 Possíveis soluções:
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>Verifique se a tabela <code className="bg-gray-200 px-1 rounded">whatsapp_conversations</code> existe no Supabase</li>
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
