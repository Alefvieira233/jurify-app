/**
 * 🚀 PAINEL MULTIAGENTES - SPACEX ENTERPRISE GRADE
 * 
 * Dashboard visual para monitoramento e controle do sistema multiagentes.
 * Interface moderna e intuitiva para acompanhar performance dos 7 agentes.
 */

import React, { useState } from 'react';
import { useMultiAgentSystem } from '@/hooks/useMultiAgentSystem';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain,
  Users,
  MessageSquare,
  TrendingUp,
  Activity,
  Zap,
  Target,
  BarChart3,
  Send,
  TestTube,
  RefreshCw,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';

export const MultiAgentDashboard: React.FC = () => {
  const {
    isProcessing,
    systemStats,
    recentActivity,
    metrics,
    processLead,
    testSystem,
    triggerAnalysis,
    loadSystemStats
  } = useMultiAgentSystem();

  type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';
  type LeadSource = 'whatsapp' | 'email' | 'chat' | 'form';

  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    legal_area: '',
    urgency: 'medium' as UrgencyLevel,
    source: 'chat' as LeadSource
  });

  // 🎯 Submete novo lead
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.message) return;

    const success = await processLead(newLead);
    if (success) {
      setNewLead({
        name: '',
        email: '',
        phone: '',
        message: '',
        legal_area: '',
        urgency: 'medium',
        source: 'chat'
      });
    }
  };

  const handleUrgencyChange = (value: string) => {
    if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
      setNewLead({ ...newLead, urgency: value });
    }
  };

  const handleSourceChange = (value: string) => {
    if (value === 'whatsapp' || value === 'email' || value === 'chat' || value === 'form') {
      setNewLead({ ...newLead, source: value });
    }
  };

  // 🎨 Cor do status do agente
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'idle': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // 📊 Ícone do agente
  const getAgentIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'coordenador': return <Brain className="h-5 w-5" />;
      case 'qualificador': return <Target className="h-5 w-5" />;
      case 'jurídico': return <Users className="h-5 w-5" />;
      case 'comercial': return <TrendingUp className="h-5 w-5" />;
      case 'analista': return <BarChart3 className="h-5 w-5" />;
      case 'comunicador': return <MessageSquare className="h-5 w-5" />;
      case 'customer success': return <CheckCircle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 🎯 HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema Multiagentes</h1>
          <p className="text-gray-600">Automação jurídica enterprise com 7 agentes especializados</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => { void testSystem(); }}
            disabled={isProcessing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            Testar Sistema
          </Button>
          <Button
            onClick={() => { void triggerAnalysis(); }}
            disabled={isProcessing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Analisar Performance
          </Button>
          <Button
            onClick={() => { void loadSystemStats(); }}
            disabled={isProcessing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 📊 MÉTRICAS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Processados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_leads_processed || 0}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversion_rate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">+2.1% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.active_conversations || 0}</div>
            <p className="text-xs text-muted-foreground">Em andamento agora</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avg_qualification_time || 0}min</div>
            <p className="text-xs text-muted-foreground">Qualificação de leads</p>
          </CardContent>
        </Card>
      </div>

      {/* 🤖 TABS PRINCIPAIS */}
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="leads">Processar Lead</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* 🤖 ABA DOS AGENTES */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics?.agents_performance.map((agent, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {getAgentIcon(agent.name)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {agent.specialization}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.current_status)}`} />
                      <Badge variant="outline" className="text-xs">
                        {agent.current_status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Mensagens</p>
                      <p className="font-semibold">{agent.messages_processed}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tempo Resp.</p>
                      <p className="font-semibold">{agent.avg_response_time}s</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Sucesso</span>
                      <span className="font-semibold">{agent.success_rate}%</span>
                    </div>
                    <Progress value={agent.success_rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 📝 ABA PROCESSAR LEAD */}
        <TabsContent value="leads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Processar Novo Lead
              </CardTitle>
              <CardDescription>
                Envie um lead para o sistema multiagentes processar automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(event) => { void handleSubmitLead(event); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={newLead.name}
                      onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                      placeholder="João Silva"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                      placeholder="joao@email.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                      placeholder="+55 11 99999-9999"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="legal_area">Área Jurídica</Label>
                    <Select
                      value={newLead.legal_area}
                      onValueChange={(value) => setNewLead({...newLead, legal_area: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trabalhista">Trabalhista</SelectItem>
                        <SelectItem value="civil">Civil</SelectItem>
                        <SelectItem value="familia">Família</SelectItem>
                        <SelectItem value="previdenciario">Previdenciário</SelectItem>
                        <SelectItem value="criminal">Criminal</SelectItem>
                        <SelectItem value="empresarial">Empresarial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgência</Label>
                    <Select
                      value={newLead.urgency}
                      onValueChange={handleUrgencyChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="source">Canal</Label>
                    <Select
                      value={newLead.source}
                      onValueChange={handleSourceChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            WhatsApp
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="chat">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </div>
                        </SelectItem>
                        <SelectItem value="form">Formulário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    value={newLead.message}
                    onChange={(e) => setNewLead({...newLead, message: e.target.value})}
                    placeholder="Descreva o problema jurídico ou necessidade do cliente..."
                    rows={4}
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={isProcessing || !newLead.name || !newLead.message}
                  className="w-full flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Processar com Multiagentes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📊 ABA ATIVIDADE */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
              <CardDescription>
                Últimas interações dos agentes com leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity?.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="p-2 bg-blue-100 rounded-full">
                        {getAgentIcon(activity.agent_id)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{activity.message}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.agent_id} • {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {activity.lead_id?.substring(0, 8)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma atividade recente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📈 ABA ANALYTICS */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance dos Agentes</CardTitle>
                <CardDescription>Taxa de sucesso por agente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics?.agents_performance.map((agent, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">
                        {getAgentIcon(agent.name)}
                        {agent.name}
                      </span>
                      <span className="font-semibold">{agent.success_rate}%</span>
                    </div>
                    <Progress value={agent.success_rate} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estatísticas do Sistema</CardTitle>
                <CardDescription>Informações gerais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Agentes Ativos</p>
                    <p className="text-2xl font-bold">{systemStats?.total_agents || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mensagens</p>
                    <p className="text-2xl font-bold">{systemStats?.messages_processed || 0}</p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Última Atividade</p>
                  <p className="text-sm">
                    {systemStats?.last_activity 
                      ? new Date(systemStats.last_activity).toLocaleString()
                      : 'Nenhuma atividade'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
