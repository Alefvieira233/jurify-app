import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Bot,
  Send,
  Settings,
  Play,
  Pause,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import WhatsAppSetup from './WhatsAppSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const WhatsAppIA = () => {
  // ============================================
  // 🔒 HOOKS - SEMPRE NO TOPO (React Rules of Hooks)
  // ============================================
  const [isActive, setIsActive] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  const {
    conversations,
    messages,
    loading,
    error,
    isEmpty,
    selectedConversation,
    selectConversation,
    sendMessage,
    markAsRead,
    fetchConversations,
  } = useWhatsAppConversations();

  // Calcular estatísticas em tempo real (SEMPRE executa)
  const iaStats = useMemo(() => {
    const totalConversations = conversations.length;
    const activeConversations = conversations.filter(c => c.status === 'ativo').length;
    const qualifiedLeads = conversations.filter(c => c.status === 'qualificado').length;
    const totalMessages = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);

    // Calcular taxa de resposta (simplificado - em produção seria mais complexo)
    const responseRate = totalConversations > 0 ? Math.round((activeConversations / totalConversations) * 100) : 0;

    return [
      { label: 'Conversas Ativas', value: activeConversations.toString(), icon: MessageSquare },
      { label: 'Taxa de Resposta', value: `${responseRate}%`, icon: CheckCircle2 },
      { label: 'Mensagens Pendentes', value: totalMessages.toString(), icon: Clock },
      { label: 'Leads Qualificados', value: qualifiedLeads.toString(), icon: BarChart3 }
    ];
  }, [conversations]);

  // ============================================
  // 🛠️ FUNÇÕES AUXILIARES
  // ============================================
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const success = await sendMessage(selectedConversation.id, newMessage, 'agent');
    if (success) {
      setNewMessage('');
    }
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    void markAsRead(id);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo':
        return 'bg-green-100 text-green-800';
      case 'aguardando':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualificado':
        return 'bg-blue-100 text-blue-800';
      case 'finalizado':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // ============================================
  // 🔀 EARLY RETURNS (após todos os hooks)
  // ============================================

  // Setup Screen
  if (showSetup) {
    return (
      <WhatsAppSetup
        onConnectionSuccess={() => {
          setShowSetup(false);
          void fetchConversations();
        }}
      />
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp IA Jurídica</h1>
            <p className="text-gray-600">Atendimento inteligente 24/7 para leads jurídicos</p>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>

        <Skeleton className="h-96" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp IA Jurídica</h1>
            <p className="text-gray-600">Atendimento inteligente 24/7 para leads jurídicos</p>
          </div>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar conversas</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => void fetchConversations()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button
                  onClick={() => setShowSetup(true)}
                  variant="outline"
                  className="border-green-600 text-green-700 hover:bg-green-50"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Conectar WhatsApp
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp IA Jurídica</h1>
            <p className="text-gray-600">Atendimento inteligente 24/7 para leads jurídicos</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => setIsActive(!isActive)}
              className={isActive ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}
            >
              {isActive ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              {isActive ? 'Ativo' : 'Pausado'}
            </Button>
            <Button
              onClick={() => setShowSetup(true)}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar IA
            </Button>
          </div>
        </div>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-8">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Nenhuma conversa ativa</h3>
              <p className="text-blue-700 mb-6">
                As conversas do WhatsApp aparecerão aqui assim que chegarem.
              </p>
              <p className="text-sm text-blue-600 mb-6">
                Status da IA: {isActive ? 'Ativa e aguardando mensagens' : 'Pausada'}
              </p>
              <Button
                onClick={() => setShowSetup(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Conectar WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Content
  return (
    <div className="p-6 space-y-6">
      {/* Header Premium */}
      <div className="relative fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1
              className="text-5xl md:text-6xl font-bold text-[hsl(var(--primary))] tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.03em' }}
            >
              WhatsApp IA
            </h1>

            {/* Status Badge */}
            <div className="relative group">
              <div className={`absolute inset-0 ${isActive ? 'bg-gradient-to-r from-green-500/30 via-green-400/20' : 'bg-gradient-to-r from-red-500/30 via-red-400/20'} to-transparent rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-500`} />
              <button
                onClick={() => setIsActive(!isActive)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm transition-all duration-500 ${
                  isActive
                    ? 'bg-gradient-to-r from-green-500/15 via-green-400/10 to-transparent border-green-500/30 text-green-700'
                    : 'bg-gradient-to-r from-red-500/15 via-red-400/10 to-transparent border-red-500/30 text-red-700'
                }`}
              >
                {isActive ? <Play className="h-3.5 w-3.5" strokeWidth={2.5} /> : <Pause className="h-3.5 w-3.5" strokeWidth={2.5} />}
                <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {isActive ? 'Ativo' : 'Pausado'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Settings Button Premium */}
            <Button
              onClick={() => setShowSetup(true)}
              className="relative group/btn overflow-hidden bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(43_96%_56%)] to-[hsl(43_96%_48%)] hover:shadow-lg transition-all duration-500 border-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(43_96%_62%)] to-[hsl(var(--accent))] opacity-0 group-hover/btn:opacity-100 blur-xl transition-opacity duration-500" style={{ filter: 'blur(20px)' }} />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <Settings className="relative h-4 w-4 mr-2 group-hover/btn:rotate-90 transition-transform duration-700" strokeWidth={2.5} />
              <span className="relative" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>Configurar IA</span>
            </Button>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[hsl(var(--muted-foreground))] mt-3 text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
          Atendimento inteligente 24/7 para leads jurídicos • <span className="font-semibold text-[hsl(var(--accent))]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{conversations.length}</span> conversas
        </p>
      </div>

      {/* IA Stats Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {iaStats.map((stat, index) => {
          const Icon = stat.icon;
          const glowColors = [
            'from-blue-500/20 via-blue-400/10',
            'from-green-500/20 via-green-400/10',
            'from-orange-500/20 via-orange-400/10',
            'from-purple-500/20 via-purple-400/10'
          ];
          const iconColors = ['text-blue-600', 'text-green-600', 'text-orange-600', 'text-purple-600'];

          return (
            <Card
              key={index}
              className="relative group card-hover rounded-3xl border-[hsl(var(--border))] overflow-hidden fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Card Glow Effect */}
              <div className={`absolute -inset-1 bg-gradient-to-br ${glowColors[index]} to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

              {/* Shine Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p
                      className="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {stat.label}
                    </p>
                    <p
                      className={`text-4xl font-bold text-[hsl(var(--foreground))]`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {stat.value}
                    </p>
                  </div>

                  {/* Icon with Glow */}
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gradient-to-br ${glowColors[index]} to-transparent rounded-2xl blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500`} />
                    <div className={`relative p-3.5 bg-gradient-to-br ${glowColors[index]} to-transparent rounded-2xl backdrop-blur-sm`}>
                      <Icon className={`h-6 w-6 ${iconColors[index]} group-hover:scale-110 transition-transform duration-500`} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        {/* Conversations List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Conversas Ativas</h3>
          </div>
          <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedConversation?.id === conv.id ? 'bg-amber-50 border-r-2 border-amber-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {conv.contact_name || conv.phone_number}
                      </h4>
                      {conv.unread_count > 0 && (
                        <span className="bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{conv.phone_number}</p>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {conv.last_message || 'Sem mensagens'}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {conv.last_message_at ? formatTime(conv.last_message_at) : '-'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(conv.status)}`}>
                        {conv.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        {selectedConversation && (
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedConversation.contact_name || selectedConversation.phone_number}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedConversation.area_juridica || 'Área não definida'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-amber-500" />
                  <span className="text-sm text-gray-600">
                    IA {selectedConversation.ia_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <p>Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'lead' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'lead'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.sender === 'ia' && (
                        <div className="flex items-center space-x-1 mb-1">
                          <Bot className="h-3 w-3 text-amber-500" />
                          <span className="text-xs text-amber-600 font-medium">IA Jurídica</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender === 'lead' ? 'text-blue-100' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      void handleSendMessage();
                    }
                  }}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <button
                  onClick={() => void handleSendMessage()}
                  className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-lg"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppIA;
