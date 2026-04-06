import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Zap, Clock, DollarSign, Bot } from 'lucide-react';

interface QualificationResult {
  legal_area?: string;
  urgency?: string;
  potential_score?: number;
  estimated_complexity?: string;
}

interface LegalValidation {
  is_viable?: boolean;
  success_probability?: number;
  complexity_assessment?: string;
  estimated_duration_months?: number;
}

interface Proposal {
  base_value?: number;
  final_value?: number;
  installments?: number;
  valid_until?: string;
}

interface FormattedMessages {
  whatsapp_message?: string;
  email_message?: string;
}

export interface ExecutionResult {
  success: boolean;
  executionId?: string;
  qualificationResult?: QualificationResult;
  legalValidation?: LegalValidation;
  proposal?: Proposal;
  formattedMessages?: FormattedMessages | string | null;
  finalResult?: unknown;
  error?: string;
  executionTime?: number;
  totalTokens?: number;
  estimatedCost?: number;
}

export interface PlaygroundResultsProps {
  result: ExecutionResult;
  showRawJson: boolean;
}

export default function PlaygroundResults({ result, showRawJson }: PlaygroundResultsProps) {
  return (
    <div className="space-y-4">
      {/* Status Header */}
      <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
        <div className="flex items-center gap-2">
          {result.success ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={result.success ? 'text-green-900' : 'text-red-900'}>
            {result.success ? 'Processamento concluido com sucesso!' : `Erro: ${result.error}`}
          </AlertDescription>
        </div>
      </Alert>

      {/* Execution Metrics */}
      {result.success && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Execution ID</p>
                  <p className="text-xs font-mono mt-1">{result.executionId?.substring(0, 12)}...</p>
                </div>
                <Zap className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo</p>
                  <p className="text-2xl font-bold">{((result.executionTime || 0) / 1000).toFixed(2)}s</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tokens</p>
                  <p className="text-2xl font-bold">{result.totalTokens?.toLocaleString() || '0'}</p>
                </div>
                <Bot className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo</p>
                  <p className="text-2xl font-bold">${(result.estimatedCost || 0).toFixed(4)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Raw JSON Output */}
      {showRawJson && result.success && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Output JSON Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-slate-950 text-green-400 p-4 rounded-lg overflow-x-auto text-xs font-mono">
              {JSON.stringify(
                {
                  executionId: result.executionId,
                  qualificationResult: result.qualificationResult,
                  legalValidation: result.legalValidation,
                  proposal: result.proposal,
                  formattedMessages: result.formattedMessages,
                  finalResult: result.finalResult
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Structured Results */}
      {result.success && !showRawJson && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Qualification Result */}
          {result.qualificationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="default">Qualificador</Badge>
                  Resultado da Qualificacao
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Area Juridica</p>
                  <p className="font-semibold">{result.qualificationResult.legal_area || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Urgencia</p>
                  <Badge variant={
                    result.qualificationResult.urgency === 'critical' ? 'destructive' :
                    result.qualificationResult.urgency === 'high' ? 'default' : 'secondary'
                  }>
                    {result.qualificationResult.urgency || 'N/A'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Potencial (Score)</p>
                  <p className="font-semibold">{result.qualificationResult.potential_score || 0}/100</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Complexidade</p>
                  <p className="font-medium">{result.qualificationResult.estimated_complexity || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legal Validation */}
          {result.legalValidation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="default" className="bg-purple-600">Juridico</Badge>
                  Validacao Juridica
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Viavel?</p>
                  <Badge variant={result.legalValidation.is_viable ? 'default' : 'destructive'}>
                    {result.legalValidation.is_viable ? 'SIM' : 'NAO'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Probabilidade de Sucesso</p>
                  <p className="font-semibold">{result.legalValidation.success_probability || 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Complexidade</p>
                  <p className="font-medium">{result.legalValidation.complexity_assessment || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Duracao Estimada</p>
                  <p className="font-medium">
                    {result.legalValidation.estimated_duration_months || 'N/A'} meses
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Proposal */}
          {result.proposal && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">Comercial</Badge>
                  Proposta Gerada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Base</p>
                  <p className="text-xl font-bold text-green-600">
                    R$ {result.proposal.base_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor Final (com desconto)</p>
                  <p className="text-2xl font-bold">
                    R$ {result.proposal.final_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Parcelas</p>
                  <p className="font-semibold">{result.proposal.installments || 1}x</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valida ate</p>
                  <p className="font-medium">
                    {result.proposal.valid_until
                      ? new Date(result.proposal.valid_until).toLocaleDateString('pt-BR')
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Formatted Messages */}
          {result.formattedMessages && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-600">Comunicador</Badge>
                  Mensagens Formatadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {typeof result.formattedMessages === 'string' ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mensagem</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {result.formattedMessages.substring(0, 150)}...
                    </p>
                  </div>
                ) : (
                  <>
                    {result.formattedMessages.whatsapp_message && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                        <p className="text-sm bg-muted p-2 rounded">
                          {result.formattedMessages.whatsapp_message.substring(0, 150)}...
                        </p>
                      </div>
                    )}
                    {result.formattedMessages.email_message && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">E-mail</p>
                        <p className="text-sm bg-muted p-2 rounded">
                          {result.formattedMessages.email_message.substring(0, 150)}...
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
