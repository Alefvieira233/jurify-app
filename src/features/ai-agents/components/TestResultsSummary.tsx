import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExecutionResult {
  success: boolean;
  response?: string;
  error?: string;
  executionTime: number;
  source: 'n8n_edge_function';
  log_id?: string;
  agente_nome?: string;
  status?: number;
  webhook_url?: string;
}

interface TestResultsSummaryProps {
  result: ExecutionResult;
}

export const TestResultsSummary: React.FC<TestResultsSummaryProps> = ({ result }) => {
  return (
    <Card className={result.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center space-x-2 ${result.success ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'}`}>
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span>Resultado da Execucao</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.success ? 'OK' : 'ERRO'}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{result.executionTime}ms</div>
              <div className="text-sm text-muted-foreground">Tempo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{result.status || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">HTTP Status</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">N8N</div>
              <div className="text-sm text-muted-foreground">Fonte</div>
            </div>
          </div>

          {/* AI Response */}
          {result.success && result.response && (
            <div>
              <h4 className="font-semibold mb-2 text-green-900 dark:text-green-300">Resposta do Agente IA:</h4>
              <div className="bg-card p-4 rounded border max-h-96 overflow-y-auto">
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap">{result.response}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Details */}
          {!result.success && result.error && (
            <div>
              <h4 className="font-semibold mb-2 text-red-900 dark:text-red-300">Erro Detalhado:</h4>
              <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded border border-red-200 dark:border-red-800">
                <p className="text-red-800 dark:text-red-300 font-mono text-sm">{result.error}</p>
              </div>
            </div>
          )}

          {/* Technical info */}
          <div className="text-xs text-muted-foreground space-y-1">
            {result.log_id && <div>Log ID: {result.log_id}</div>}
            {result.webhook_url && <div>Webhook: {result.webhook_url}</div>}
            <div>Timestamp: {new Date().toISOString()}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
