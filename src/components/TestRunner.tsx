/**
 * ðŸ§ª COMPONENTE DE TESTE DO SISTEMA MULTIAGENTES
 * 
 * Interface para executar e visualizar testes do sistema multiagentes.
 */

import React, { useState } from 'react';
import { runMultiAgentTests } from '@/tests/MultiAgentSystemTest';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TestTube, 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';

export const TestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults(null);

    try {
      console.log('ðŸ§ª Iniciando testes do sistema multiagentes...');
      const results = await runMultiAgentTests();
      setTestResults(results);
    } catch (error) {
      console.error('âŒ Erro ao executar testes:', error);
      setTestResults({
        overall_status: 'ERROR',
        error: (error instanceof Error ? error.message : String(error)),
        tests: []
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testes do Sistema Multiagentes</h1>
          <p className="text-gray-600">ValidaÃ§Ã£o completa do funcionamento do sistema</p>
        </div>
        <Button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Executar Testes
            </>
          )}
        </Button>
      </div>

      {testResults && (
        <div className="space-y-6">
          {/* Resumo Geral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Resumo dos Testes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.passed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Passou</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.failed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Falhou</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.success_rate || 0}%
                  </div>
                  <div className="text-sm text-gray-600">Taxa de Sucesso</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {testResults.total_time_ms || 0}ms
                  </div>
                  <div className="text-sm text-gray-600">Tempo Total</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progresso Geral</span>
                  <span>{testResults.success_rate || 0}%</span>
                </div>
                <Progress value={parseFloat(testResults.success_rate || '0')} className="h-2" />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Badge 
                  variant={testResults.overall_status === 'SUCCESS' ? 'default' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  {testResults.overall_status === 'SUCCESS' ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {testResults.overall_status}
                </Badge>
                <span className="text-sm text-gray-600">
                  {new Date(testResults.timestamp).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Detalhes dos Testes */}
          <div className="grid grid-cols-1 gap-4">
            {testResults.tests?.map((test: any, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      {test.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(test.status)}>
                        {test.status.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-gray-600">
                        {test.duration}ms
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Detalhes do Teste */}
                  {test.details && Object.keys(test.details).length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Detalhes:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(test.details).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-medium">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Erros */}
                  {test.errors && test.errors.length > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-2 text-red-800 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Erros:
                      </h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {test.errors.map((error: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-red-500">â€¢</span>
                            <span>{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {testResults?.error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Erro na ExecuÃ§Ã£o dos Testes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-red-700">{testResults.error}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

