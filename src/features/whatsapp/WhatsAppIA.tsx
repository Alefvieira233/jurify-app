import { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Bot,
  Send,
  Settings,
  Search,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Wifi,
  User,
  ArrowLeft,
} from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import WhatsAppSetup from './WhatsAppSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ConversationFilter = 'todos' | 'leads' | 'agendados';

const WhatsAppIA = () => {
  const [newMessage, setNewMessage] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('todos');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stats
  const stats = useMemo(() => {
    const active = conversations.filter(c => c.status === 'ativo').length;
    const qualified = conversations.filter(c => c.status === 'qualificado').length;
    const pending = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
    return { active, qualified, pending, total: conversations.length };
  }, [conversations]);

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        (c.contact_name?.toLowerCase().includes(q)) ||
        c.phone_number.includes(q) ||
        (c.last_message?.toLowerCase().includes(q))
      );
    }

    if (activeFilter === 'leads') {
      filtered = filtered.filter(c => c.status === 'ativo' || c.status === 'aguardando');
    } else if (activeFilter === 'agendados') {
      filtered = filtered.filter(c => c.status === 'qualificado');
    }

    return filtered;
  }, [conversations, searchQuery, activeFilter]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    const success = await sendMessage(selectedConversation.id, newMessage, 'agent');
    if (success) setNewMessage('');
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    void markAsRead(id);
    setShowMobileChat(true);
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      aguardando: { label: 'Aguardando', className: 'bg-amber-100 text-amber-700 border-amber-200' },
      qualificado: { label: 'Agendado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      finalizado: { label: 'Finalizado', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    };
    const badge = map[status] ?? map.finalizado ?? { label: status, className: '' };
    return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>{badge.label}</Badge>;
  };

  const getInitials = (name: string | null, phone: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      const first = parts[0] ?? '';
      const last = parts[parts.length - 1] ?? '';
      return parts.length > 1
        ? ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
        : first.substring(0, 2).toUpperCase();
    }
    return phone.slice(-2);
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
      'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // ============================================
  // SETUP SCREEN
  // ============================================
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

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-[hsl(var(--background))]">
        <div className="w-96 border-r border-[hsl(var(--border))] p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-8 w-full" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-64 w-64 rounded-lg" />
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[hsl(var(--background))]">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">Erro ao carregar</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => void fetchConversations()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
              </Button>
              <Button onClick={() => setShowSetup(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Smartphone className="h-4 w-4 mr-2" /> Conectar WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================
  // CONVERSATION LIST COMPONENT
  // ============================================
  const ConversationList = () => (
    <div className={`flex flex-col h-full border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}
      style={{ width: '100%', maxWidth: '400px', minWidth: '320px' }}
    >
      {/* Header */}
      <div className="p-4 border-b border-[hsl(var(--border))]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Conversas</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSetup(true)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void fetchConversations()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Filters */}
        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as ConversationFilter)}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="todos" className="text-xs flex-1">Todos</TabsTrigger>
            <TabsTrigger value="leads" className="text-xs flex-1">Leads</TabsTrigger>
            <TabsTrigger value="agendados" className="text-xs flex-1">Agendados</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation Items */}
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-10 w-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = selectedConversation?.id === conv.id;
            return (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[hsl(var(--border))]/50 ${
                  isSelected
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500'
                    : 'hover:bg-[hsl(var(--muted))]/50 border-l-2 border-l-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`h-11 w-11 rounded-full ${getAvatarColor(conv.id)} flex items-center justify-center text-white text-sm font-semibold`}>
                    {getInitials(conv.contact_name, conv.phone_number)}
                  </div>
                  {conv.status === 'ativo' && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[hsl(var(--card))]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                      {conv.contact_name || conv.phone_number}
                    </span>
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))] flex-shrink-0">
                      {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getStatusBadge(conv.status)}
                  </div>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-1">
                    {conv.last_message || 'Sem mensagens'}
                  </p>
                </div>

                {/* Unread Badge */}
                {conv.unread_count > 0 && (
                  <div className="flex-shrink-0 mt-1">
                    <span className="bg-emerald-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center">
                      {conv.unread_count > 99 ? '99+' : conv.unread_count}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </ScrollArea>

      {/* Stats Footer */}
      <div className="p-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30">
        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
          <span>{stats.total} conversas</span>
          <span>{stats.active} ativos</span>
          <span>{stats.pending} pendentes</span>
          <span>{stats.qualified} agendados</span>
        </div>
      </div>
    </div>
  );

  // ============================================
  // CHAT PANEL COMPONENT
  // ============================================
  const ChatPanel = () => {
    if (!selectedConversation) {
      return (
        <div className={`flex-1 flex flex-col items-center justify-center bg-[hsl(var(--background))] ${showMobileChat ? 'hidden' : ''}`}>
          <div className="text-center max-w-sm">
            <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-10 w-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">WhatsApp IA Jurídica</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">
              Gerencie suas conversas e monitore interações. Selecione uma conversa para começar.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowSetup(true)} variant="outline" size="sm">
                <Wifi className="h-4 w-4 mr-2" /> Conexões
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex-1 flex flex-col bg-[hsl(var(--background))] ${!showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          {/* Mobile back button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 lg:hidden"
            onClick={() => setShowMobileChat(false)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Avatar */}
          <div className={`h-10 w-10 rounded-full ${getAvatarColor(selectedConversation.id)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
            {getInitials(selectedConversation.contact_name, selectedConversation.phone_number)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                {selectedConversation.contact_name || selectedConversation.phone_number}
              </h3>
              {getStatusBadge(selectedConversation.status)}
            </div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {selectedConversation.phone_number}
              {selectedConversation.area_juridica && ` • ${selectedConversation.area_juridica}`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`text-[10px] ${selectedConversation.ia_active ? 'border-emerald-300 text-emerald-600' : 'border-gray-300 text-gray-500'}`}>
              <Bot className="h-3 w-3 mr-1" />
              IA {selectedConversation.ia_active ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3 max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-[hsl(var(--muted-foreground))]">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              messages.map((message) => {
                const isLead = message.sender === 'lead';
                const isIA = message.sender === 'ia';
                return (
                  <div key={message.id} className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isLead
                        ? 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-bl-md'
                        : isIA
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-blue-600 text-white rounded-br-md'
                    }`}>
                      {isIA && (
                        <div className="flex items-center gap-1 mb-1">
                          <Bot className="h-3 w-3 text-emerald-200" />
                          <span className="text-[10px] text-emerald-200 font-medium">IA Jurídica</span>
                        </div>
                      )}
                      {!isLead && !isIA && (
                        <div className="flex items-center gap-1 mb-1">
                          <User className="h-3 w-3 text-blue-200" />
                          <span className="text-[10px] text-blue-200 font-medium">Você</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                      <p className={`text-[10px] mt-1 text-right ${
                        isLead ? 'text-[hsl(var(--muted-foreground))]' : 'text-white/70'
                      }`}>
                        {formatMessageTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Digite uma mensagem..."
              className="flex-1 h-10"
            />
            <Button
              onClick={() => void handleSendMessage()}
              disabled={!newMessage.trim()}
              size="icon"
              className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // EMPTY STATE (no conversations yet)
  // ============================================
  if (isEmpty) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center max-w-md">
          <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="h-12 w-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">WhatsApp IA Jurídica</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-2">
            Gerencie suas conversas e monitore interações
          </p>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-8">
            Conecte seu WhatsApp para começar a receber e responder mensagens automaticamente com IA.
          </p>
          <Button
            onClick={() => setShowSetup(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 h-auto text-base"
          >
            <Smartphone className="h-5 w-5 mr-2" />
            Conectar WhatsApp
          </Button>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN LAYOUT
  // ============================================
  return (
    <main aria-label="WhatsApp IA" className="flex h-[calc(100vh-4rem)] bg-[hsl(var(--background))] overflow-hidden">
      <ConversationList />
      <ChatPanel />
    </main>
  );
};

export default WhatsAppIA;
