/**
 * 🚀 ENTERPRISE MULTIAGENT DASHBOARD - PRODUCTION READY
 * 
 * Dashboard enterprise completo com métricas reais, monitoramento em tempo real
 * e interface profissional para sistema multiagentes de produção.
 */

import React, { useState } from 'react';
import { useEnterpriseMultiAgent } from '@/hooks/useEnterpriseMultiAgent';
import { Priority } from '@/lib/multiagents/types';
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
  Activity,
  BarChart3,
  Brain,
  CheckCircle,
  Clock,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  RefreshCw,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
  XCircle
} from 'lucide-react';

export const EnterpriseDashboard: React.FC = () => {
  const {
    isInitialized,
    isProcessing,
    metrics,
    systemHealth,
    recentActivity,
    processLead,
    runSystemTest,
    loadRealTimeMetrics,
    validateLeadData,
    systemStats
  } = useEnterpriseMultiAgent();

  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    legal_area: '',
    urgency: Priority.MEDIUM,
    source: 'chat' as 'whatsapp' | 'email' | 'chat' | 'form'
  });

  // 🎯 Submete novo lead
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateLeadData(newLead);
    if (!validation.isValid) {
      return;
    }

    const success = await processLead(newLead);
    if (success) {
      setNewLead({
        name: '',
        email: '',
        phone: '',
        message: '',
        legal_area: '',
        urgency: Priority.MEDIUM,
        source: 'chat'
      });
    }
  };

  // 🎨 Helpers para UI
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAgentStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'idle': return <Clock className="h-4 w-4 text-gray-400" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'coordenador': return <Brain className="h-5 w-5" />;
      case 'qualificador': return <Target className="h-5 w-5" />;
      case 'juridico': return <Shield className="h-5 w-5" />;
      case 'comercial': return <TrendingUp className="h-5 w-5" />;
      case 'comunicador': return <MessageSquare className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Inicializando Sistema Enterprise...</p>
          <p className="text-sm text-gray-600">Carregando agentes multiagentes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-8 bg-background min-h-screen reveal-up">
      {/* 🎯 HEADER ENTERPRISE - MONOLITH STYLE */}
      <div className="bg-card border border-border p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-black text-foreground flex items-center gap-4 tracking-tighter" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              <Brain className="h-10 w-10 text-primary" />
              Intelligence Dashboard
            </h1>
            <p className="text-foreground/50 mt-3 font-medium tracking-wide">
              Automação jurídica de alta performance com <span className="text-primary font-bold">[{systemStats?.total_agents || 0}] AGENTES</span> em operação.
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-6">
            {/* Status do Sistema */}
            <div className="flex items-center gap-4 px-6 py-3 bg-foreground/5 border border-border">
              <div className={`w-3 h-3 ${systemHealth?.overall_status === 'healthy' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' :
                systemHealth?.overall_status === 'warning' ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                }`} />
              <span className="text-[10px] font-black tracking-[0.2em]">
                {systemHealth?.overall_status?.toUpperCase() || 'SYSTEM OFFLINE'}
              </span>
            </div>

            <button
              onClick={() => void runSystemTest()}
              disabled={isProcessing}
              className="btn-sharp border border-foreground/10 hover:border-primary/50"
            >
              System Audit
            </button>

            <button
              onClick={() => void loadRealTimeMetrics()}
              disabled={isProcessing}
              className="btn-sharp bg-primary text-background hover:bg-white hover:text-black font-black"
            >
              <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 📊 MÉTRICAS ENTERPRISE EM TEMPO REAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <Card className="card-monolith border-l-4 border-l-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Leads Processados</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">
              {metrics?.leads_processed_today || 0}
            </div>
            <div className="h-1 lg:w-32 bg-primary/20 mt-4 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: '45%' }} />
            </div>
          </CardContent>
        </Card>

        <Card className="card-monolith border-l-4 border-l-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Conversão Global</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">
              {metrics?.conversion_rate_7d.toFixed(1) || 0}%
            </div>
            <p className="text-[10px] font-bold text-green-500 mt-4 uppercase tracking-widest">
              +2.4% vs last period
            </p>
          </CardContent>
        </Card>

        <Card className="card-monolith border-l-4 border-l-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Latência Média</CardTitle>
            <Clock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">
              {metrics?.avg_response_time.toFixed(1) || 0}s
            </div>
            <p className="text-[10px] font-bold text-foreground/40 mt-4 uppercase tracking-widest">
              High Priority Sync
            </p>
          </CardContent>
        </Card>

        <Card className="card-monolith border-l-4 border-l-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">System Efficiency</CardTitle>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black tracking-tighter">
              {systemHealth?.performance_score.toFixed(0) || 0}
            </div>
            <p className="text-[10px] font-bold text-primary mt-4 uppercase tracking-widest">
              Optimized Monolith
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 🤖 TABS ENTERPRISE */}
      <Tabs defaultValue="agents" className="space-y-10">
        <TabsList className="flex w-full bg-card border border-border p-2">
          <TabsTrigger value="agents" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Network Agents
          </TabsTrigger>
          <TabsTrigger value="process" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Lead Processing
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Live Stream
          </TabsTrigger>
          <TabsTrigger value="health" className="flex-1 btn-sharp data-[state=active]:bg-foreground data-[state=active]:text-background">
            Core Health
          </TabsTrigger>
        </TabsList>

        {/* 🤖 ABA DOS AGENTES ENTERPRISE */}
        <TabsContent value="agents" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics?.agent_performance.map((agent, index) => (
              <Card key={index} className="card-monolith hover:shadow-2xl transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 border border-primary/20">
                        {getAgentIcon(agent.id)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <CardDescription className="text-sm">
                          ID: {agent.id}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getAgentStatusIcon(agent.current_status)}
                      <Badge variant="outline" className="text-xs">
                        {agent.current_status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Mensagens</p>
                      <p className="font-semibold text-lg">{agent.messages_processed}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Fila</p>
                      <p className="font-semibold text-lg">{agent.queue_size}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Tempo Resp.</p>
                      <p className="font-semibold">{agent.avg_response_time}s</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Atividade</p>
                      <p className="font-semibold text-xs">
                        {agent.last_activity.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Taxa de Sucesso</span>
                      <span className="font-semibold">{agent.success_rate.toFixed(1)}%</span>
                    </div>
                    <Progress value={agent.success_rate} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 📝 ABA PROCESSAR LEAD ENTERPRISE */}
        <TabsContent value="process" className="space-y-6">
          <Card className="card-monolith">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Processar Lead Enterprise
              </CardTitle>
              <CardDescription>
                Envie um lead para processamento automático pelos agentes especializados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleSubmitLead(e)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={newLead.name}
                      onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                      placeholder="João Silva"
                      required
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      placeholder="joao@email.com"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="+55 11 99999-9999"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="legal_area">Área Jurídica</Label>
                    <Select
                      value={newLead.legal_area}
                      onValueChange={(value) => setNewLead({ ...newLead, legal_area: value })}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Selecione a área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trabalhista">Trabalhista</SelectItem>
                        <SelectItem value="civil">Civil</SelectItem>
                        <SelectItem value="familia">Família</SelectItem>
                        <SelectItem value="previdenciario">Previdenciário</SelectItem>
                        <SelectItem value="criminal">Criminal</SelectItem>
                        <SelectItem value="empresarial">Empresarial</SelectItem>
                        <SelectItem value="tributario">Tributário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgency">Urgência</Label>
                    <Select
                      value={newLead.urgency}
                      onValueChange={(value: string) => setNewLead({ ...newLead, urgency: value as Priority })}
                    >
                      <SelectTrigger className="border-gray-300">
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
                    <Label htmlFor="source">Canal de Origem</Label>
                    <Select
                      value={newLead.source}
                      onValueChange={(value: string) => setNewLead({ ...newLead, source: value as typeof newLead.source })}
                    >
                      <SelectTrigger className="border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-green-600" />
                            WhatsApp
                          </div>
                        </SelectItem>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-600" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="chat">
                          <div className="flex items-center gap-2">
                            <MessageCircle className="h-4 w-4 text-purple-600" />
                            Chat Online
                          </div>
                        </SelectItem>
                        <SelectItem value="form">Formulário Web</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Descrição do Caso *</Label>
                  <Textarea
                    id="message"
                    value={newLead.message}
                    onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
                    placeholder="Descreva detalhadamente o problema jurídico ou necessidade do cliente..."
                    rows={4}
                    required
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    Mínimo 10 caracteres. Seja específico para melhor qualificação.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing || !newLead.name || !newLead.message}
                  className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Processando com IA...
                    </>
                  ) : (
                    <>
                      <Brain className="h-5 w-5" />
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
          <Card className="card-monolith">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Atividade em Tempo Real
              </CardTitle>
              <CardDescription>
                Últimas interações dos agentes com leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity?.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-foreground/5 border border-border hover:bg-foreground/10 transition-colors">
                      <div className="p-2 bg-primary/10 border border-primary/20 flex-shrink-0">
                        {getAgentIcon(activity.agent_id)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm">{activity.message}</p>
                          <Badge variant="outline" className="text-xs">
                            {activity.agent_id}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {activity.response}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(activity.created_at).toLocaleString()}</span>
                          {activity.leads?.name && (
                            <span>Cliente: {activity.leads.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhuma atividade recente</p>
                    <p className="text-sm">As interações dos agentes aparecerão aqui</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🏥 ABA SAÚDE DO SISTEMA */}
        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="card-monolith">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  Status do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Status Geral</span>
                  <Badge className={getHealthColor(systemHealth?.overall_status || 'unknown')}>
                    {systemHealth?.overall_status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uptime</span>
                    <span className="font-semibold">{systemHealth?.uptime_percentage || 0}%</span>
                  </div>
                  <Progress value={systemHealth?.uptime_percentage || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Performance Score</span>
                    <span className="font-semibold">{systemHealth?.performance_score.toFixed(0) || 0}/100</span>
                  </div>
                  <Progress value={systemHealth?.performance_score || 0} className="h-2" />
                </div>

                <div className="pt-4 border-t text-sm text-gray-600">
                  <p>Última verificação: {systemHealth?.last_check.toLocaleString()}</p>
                  <p>Taxa de erro: {systemHealth?.error_rate.toFixed(2) || 0}%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="card-monolith">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Estatísticas do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Agentes Ativos</p>
                    <p className="text-2xl font-bold text-green-600">{systemStats?.total_agents || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Mensagens</p>
                    <p className="text-2xl font-bold text-blue-600">{systemStats?.messages_processed || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Conversas Ativas</p>
                    <p className="text-2xl font-bold text-purple-600">{metrics?.active_conversations || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Taxa Conversão</p>
                    <p className="text-2xl font-bold text-orange-600">{metrics?.conversion_rate_7d.toFixed(1) || 0}%</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">Agentes Enterprise:</p>
                  <div className="flex flex-wrap gap-2">
                    {systemStats?.active_agents?.map((agent: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {agent}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
