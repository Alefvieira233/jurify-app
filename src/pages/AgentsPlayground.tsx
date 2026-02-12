/**
 * 🧪 AGENTS PLAYGROUND - TESTE DE AGENTES EM TEMPO REAL
 *
 * Interface para testar o sistema multiagentes com mensagens customizadas.
 * Permite validar a inteligência dos agentes antes de liberar para produção.
 *
 * @version 1.0.0
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Bot,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  Clock,
  DollarSign,
  FileJson
} from 'lucide-react';
import { multiAgentSystem } from '@/lib/multiagents';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

interface ExecutionResult {
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

const EXAMPLE_MESSAGES = [
  {
    label: 'Caso Trabalhista',
    text: 'Fui demitido sem justa causa há 2 meses. A empresa não pagou minhas verbas rescisórias, incluindo FGTS de R$ 12.000 e aviso prévio de R$ 3.500. Trabalhei por 5 anos com carteira assinada. Preciso processar a empresa.'
  },
  {
    label: 'Direito do Consumidor',
    text: 'Comprei uma TV de 55 polegadas por R$ 2.800 há 3 meses. Ela apresentou defeito na tela (linhas verticais). A loja se recusa a trocar alegando que foi mau uso, mas nunca caiu e sempre foi bem cuidada. Quero meu dinheiro de volta.'
  },
  {
    label: 'Direito de Família',
    text: 'Preciso entrar com divórcio consensual. Somos casados há 8 anos no regime de comunhão parcial de bens. Temos um apartamento de R$ 450.000 e dois filhos menores (7 e 4 anos). Já conversamos e queremos fazer amigavelmente.'
  },
  {
    label: 'Previdenciário',
    text: 'Minha aposentadoria por tempo de contribuição foi negada pelo INSS. Contribuí por 33 anos e 4 meses. O INSS alegou que faltam 2 anos de contribuição, mas tenho contratos de trabalho que comprovam o período. Preciso recorrer.'
  },
  {
    label: 'Acidente de Trânsito',
    text: 'Sofri acidente de carro há 1 mês. O outro motorista avançou o sinal vermelho e bateu na lateral do meu veículo. Tenho boletim de ocorrência, testemunhas e laudos médicos. Tive fraturas no braço e fiquei 15 dias sem trabalhar. Quero ser indenizado.'
  }
];

export default function AgentsPlayground() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLoadExample = (exampleText: string) => {
    setMessage(exampleText);
    setResult(null);
  };

  const handleProcessMessage = async () => {
    if (!message.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Digite uma mensagem para processar.',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Não autenticado',
        description: 'Você precisa estar logado para testar os agentes.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const startTime = Date.now();

    try {
      // Inicializar o sistema se necessário
      if (!(multiAgentSystem as unknown as Record<string, unknown>)['initialized']) {
        multiAgentSystem.initialize();
      }

      // Criar lead de teste
      const testLead = {
        id: `test_${Date.now()}`,
        name: 'Lead de Teste - Playground',
        email: 'teste@playground.jurify.com',
        phone: '(00) 00000-0000',
        message: message,
        source: 'playground' as const,
        tenantId: user.id // Usar o ID do usuário como tenant
      };

      // Processar com o sistema multiagentes
      const agentResult = await multiAgentSystem.processLead(
        testLead,
        message,
        'playground'
      );

      const executionTime = Date.now() - startTime;

      // Verificar se agentResult existe
      if (!agentResult) {
        throw new Error(
          'Sistema multiagentes não retornou resultado. ' +
          'Possível problema: o método processLead() retorna Promise<void> em vez de um objeto com dados.'
        );
      }

      setResult({
        success: true,
        executionId: agentResult.executionId || `exec_${Date.now()}`,
        qualificationResult: agentResult.qualificationResult || undefined,
        legalValidation: agentResult.legalValidation || undefined,
        proposal: agentResult.proposal || undefined,
        formattedMessages: agentResult.formattedMessages || null,
        finalResult: agentResult.finalResult || null,
        executionTime,
        totalTokens: agentResult.totalTokens || 0,
        estimatedCost: agentResult.estimatedCost || 0
      });

      toast({
        title: 'Processamento concluído!',
        description: `Executado em ${(executionTime / 1000).toFixed(2)}s`,
      });

    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';

      setResult({
        success: false,
        error: errorMsg,
        executionTime
      });

      toast({
        title: 'Erro no processamento',
        description: errorMsg || 'Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8" />
          Playground de Agentes IA
        </h1>
        <p className="text-muted-foreground mt-1">
          Teste o sistema multiagentes com mensagens customizadas em tempo real
        </p>
      </div>

      {/* Example Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Exemplos Rápidos</CardTitle>
          <CardDescription>Clique em um exemplo para carregar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_MESSAGES.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleLoadExample(example.text)}
                disabled={loading}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Input Message */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagem do Lead</CardTitle>
          <CardDescription>
            Digite ou cole uma mensagem para testar o sistema multiagentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ex: Fui demitido sem justa causa e a empresa não pagou minhas verbas rescisórias..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            disabled={loading}
            className="font-mono text-sm"
          />
          <div className="flex gap-3">
            <Button
              onClick={() => void handleProcessMessage()}
              disabled={loading || !message.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Processar com Agentes
                </>
              )}
            </Button>
            {result && (
              <Button
                variant="outline"
                onClick={() => setShowRawJson(!showRawJson)}
              >
                <FileJson className="h-4 w-4 mr-2" />
                {showRawJson ? 'Ocultar' : 'Ver'} JSON
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
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
                {result.success ? 'Processamento concluído com sucesso!' : `Erro: ${result.error}`}
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
                      Resultado da Qualificação
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Área Jurídica</p>
                      <p className="font-semibold">{result.qualificationResult.legal_area || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Urgência</p>
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
                      <Badge variant="default" className="bg-purple-600">Jurídico</Badge>
                      Validação Jurídica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Viável?</p>
                      <Badge variant={result.legalValidation.is_viable ? 'default' : 'destructive'}>
                        {result.legalValidation.is_viable ? 'SIM' : 'NÃO'}
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
                      <p className="text-xs text-muted-foreground">Duração Estimada</p>
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
                      <p className="text-xs text-muted-foreground">Válida até</p>
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
                        <p className="text-sm bg-gray-100 p-2 rounded">
                          {result.formattedMessages.substring(0, 150)}...
                        </p>
                      </div>
                    ) : (
                      <>
                        {result.formattedMessages.whatsapp_message && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">WhatsApp</p>
                            <p className="text-sm bg-gray-100 p-2 rounded">
                              {result.formattedMessages.whatsapp_message.substring(0, 150)}...
                            </p>
                          </div>
                        )}
                        {result.formattedMessages.email_message && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">E-mail</p>
                            <p className="text-sm bg-gray-100 p-2 rounded">
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
      )}
    </div>
  );
}
