import { useState } from 'react';
import { Search, ArrowUpRight, Activity, FileSignature, MessageSquare, FileText, Scale, CalendarClock, Briefcase, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';

const Dashboard = () => {
  usePageTitle('Início - Ferramentas de IA');
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Dashboard: Painel de Ferramentas Funcionais ── */
  const aiAgents = [
    { 
      id: '1', name: 'Elaborar Petição Inicial (INSS)', role: 'Geração de Peças Jurídicas', 
      desc: 'Faça o upload dos documentos do cliente. A IA vai analisar os laudos e montar a peça com as atualizações recentes da lei.', 
      icon: FileSignature, color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-500/20', status: 'Ativo', action: 'Criar Petição'
    },
    { 
      id: '2', name: 'Análise de Contrato ou Acordo', role: 'Revisão Documental Rápida', 
      desc: 'Anexe contratos densos (aluguel, honorários, M&A) e a IA vai apontar imediatamente cláusulas abusivas ou nulas.', 
      icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/20', status: 'Ativo', action: 'Analisar Contrato'
    },
    { 
      id: '3', name: 'Assistente de Triagem de WhatsApp', role: 'Atendimento a Novos Clientes', 
      desc: 'Responde dúvidas comuns, pede os dados mínimos do caso e já deixa na sua agenda. Funciona 24/7 sem você tocar no celular.', 
      icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/20', status: 'Configurar', action: 'Ver Chatbot'
    },
    { 
      id: '4', name: 'Pesquisa Rápida de Jurisprudência', role: 'Pesquisa e Base Legal', 
      desc: 'Descreva a tese que você precisa defender e a IA vasculha o STJ, TST ou STF para achar os melhores precedentes em texto pronto.', 
      icon: Scale, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/20', status: 'Ativo', action: 'Fazer Pesquisa' 
    },
    { 
      id: '5', name: 'Resumo de Processo e Autos', role: 'Ganho de Tempo', 
      desc: 'Possui um processo de 500 páginas? A IA lê o PDF inteiro e entrega uma linha do tempo pronta com o que realmente importa.', 
      icon: Briefcase, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-500/20', status: 'Novo', action: 'Resumir Autos'
    },
    { 
      id: '6', name: 'Controle de Intimações (Diários)', role: 'Segurança e Prazos', 
      desc: 'O sistema varre as publicações Diárias no seu nome e alerta via e-mail e WhatsApp sobre os prazos iminentes.', 
      icon: CalendarClock, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-500/20', status: 'Ativo', action: 'Ver Intimações'
    },
  ];

  const filteredAgents = aiAgents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card rounded-[16px] overflow-hidden relative fade-in">
      {/* ── Background ambient glows ── */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Hero Banner ── */}
      <div className="relative pt-12 pb-10 px-6 sm:px-10 flex flex-col items-center text-center z-10 border-b border-border/10">
        <Badge variant="outline" className="mb-4 py-1.5 px-3 bg-primary/5 border-primary/20 text-primary uppercase tracking-widest text-[11px] font-semibold">
          <Activity className="w-3.5 h-3.5 mr-2 inline" />
          Seu escritório trabalhando mais rápido
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mx-auto max-w-3xl mb-3 leading-[1.2]">
          O que você precisa automatizar hoje?
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl leading-relaxed mb-8 mx-auto">
          Escolha uma ferramenta abaixo para delegar tareas rotineiras do seu escritório. Ganhe escala escrevendo petições ou lendo processos em minutos.
        </p>

        {/* ── Search Bar ── */}
        <div className="relative w-full max-w-xl group mx-auto">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors duration-300" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background/50 border border-border/40 backdrop-blur-md rounded-[12px] py-3.5 pl-11 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm transition-all duration-300"
            placeholder="Ex: 'Criar Petição INSS', 'Analisar Contrato'..."
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            <Button size="icon" variant="ghost" className="w-8 h-8 rounded-[8px] hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-300">
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-8 z-10 bg-background/5 md:bg-transparent">
        
        {/* Navigation / Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-6 border-b border-border/30 pb-2 w-full sm:max-w-md overflow-x-auto scroolbar-hide">
            <button className="text-sm font-semibold text-primary border-b-2 border-primary pb-2 px-1 whitespace-nowrap">Assistentes Práticos</button>
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors pb-2 px-1 whitespace-nowrap">Meus Arquivos</button>
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors pb-2 px-1 whitespace-nowrap">Histórico</button>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.length > 0 ? (
            filteredAgents.map((agent, i) => (
              <Card key={agent.id} className="group relative overflow-hidden border border-border/20 bg-background/40 hover:bg-card hover:border-border/40 transition-all duration-300 hover:shadow-sm" style={{ animationDelay: `${i * 0.05}s` }}>
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center ${agent.bg} border ${agent.border} transition-transform duration-300`}>
                      <agent.icon className={`w-4 h-4 ${agent.color}`} strokeWidth={2} />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-semibold tracking-wide py-0.5 px-2 ${agent.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : agent.status === 'Novo' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/50 text-muted-foreground border-border/30'}`}>
                      {agent.status === 'Ativo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
                      {agent.status}
                    </Badge>
                  </div>
                  
                  <h3 className="text-base font-bold text-foreground mb-1 leading-tight">{agent.name}</h3>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase mb-2.5">{agent.role}</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed mb-5 min-h-[50px] flex-1">
                    {agent.desc}
                  </p>

                  <div className="flex items-center mt-auto">
                    <Button variant="ghost" className="w-full justify-between px-3 bg-muted/40 hover:bg-primary/10 hover:text-primary font-medium text-sm border border-transparent hover:border-primary/20 transition-all duration-200 h-9">
                      {agent.action}
                      <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
             <div className="col-span-full py-16 text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-base font-medium text-foreground">Nenhuma ferramenta encontrada</h3>
                <p className="text-sm text-muted-foreground mt-1">Busque por petição, contrato, triagem...</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
