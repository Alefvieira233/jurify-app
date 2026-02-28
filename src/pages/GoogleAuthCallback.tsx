/**
 * 📅 GOOGLE OAUTH CALLBACK PAGE
 *
 * Processa o retorno da autenticação OAuth do Google Calendar.
 * Troca o código por tokens e redireciona de volta para configurações.
 *
 * @route /auth/google/callback
 * @version 2.0.0 (OAuth Real)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGoogleCalendarConnection } from '@/hooks/useGoogleCalendarConnection';

const GoogleAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback } = useGoogleCalendarConnection();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          throw new Error(`Google recusou a permissão: ${error}`);
        }

        if (!code) {
          throw new Error('Código de autorização ausente no callback');
        }

        await handleCallback(code);
        setStatus('success');

        setTimeout(() => {
          navigate('/?tab=configuracoes');
        }, 2000);

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        setStatus('error');
        setErrorMessage(message);

        setTimeout(() => {
          navigate('/?tab=configuracoes');
        }, 5000);
      }
    };

    void processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            Conectando Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-gray-300 font-medium">Processando autenticação...</p>
              <p className="text-sm text-gray-400 mt-2">Aguarde enquanto validamos suas credenciais</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-100 mb-2">
                Conectado com sucesso!
              </h3>
              <p className="text-gray-300">Google Calendar configurado corretamente.</p>
              <p className="text-sm text-gray-400 mt-4">
                Redirecionando para configurações...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-300 mb-2">
                Erro na Autenticação
              </h3>
              <p className="text-red-200 mb-4 text-sm">{errorMessage}</p>
              <p className="text-sm text-gray-400 mt-4">
                Redirecionando para configurações em 5 segundos...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoogleAuthCallback;

