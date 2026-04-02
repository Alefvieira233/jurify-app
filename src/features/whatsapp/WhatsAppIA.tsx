import { useState, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import {
  MessageSquare,
  Bot,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Wifi,
  User,
  ArrowLeft,
} from 'lucide-react';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import type { WhatsAppConversation, WhatsAppMessage } from '@/hooks/useWhatsAppConversations';
import WhatsAppSetup from './WhatsAppSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageTitle } from '@/hooks/usePageTitle';
import type { ConversationFilterState } from './conversationFilterTypes';
import { EMPTY_CONV_FILTERS } from './conversationFilterTypes';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

import ConversationList from './ConversationList';
import MessageView from './MessageView';
import ChatInput from './ChatInput';
import { getAvatarColor, getConvInitials, getStatusBadge, getAgentStatusBadge } from './whatsapp-helpers';

// ── ChatPanel ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  selectedConversation: WhatsAppConversation | null;
  showMobileChat: boolean;
  onBack: () => void;
  messages: WhatsAppMessage[];
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: () => void;
  onSendMedia: (file: File, mediaType: 'image' | 'audio' | 'document') => void;
  messagesEndRef: RefObject<HTMLDivElement>;
  onSetup: () => void;
  onToggleIA: () => void;
}

const ChatPanel = ({
  selectedConversation,
  showMobileChat,
  onBack,
  messages,
  newMessage,
  setNewMessage,
  onSendMessage,
  onSendMedia,
  messagesEndRef,
  onSetup,
  onToggleIA,
}: ChatPanelProps) => {
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
            <Button onClick={onSetup} variant="outline" size="sm">
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
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onBack} aria-label="Voltar para conversas">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className={`h-10 w-10 rounded-full ${getAvatarColor(selectedConversation.id)} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
          {getConvInitials(selectedConversation.contact_name, selectedConversation.phone_number)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
              {selectedConversation.contact_name || selectedConversation.phone_number}
            </h3>
            {getStatusBadge(selectedConversation.status)}
            {getAgentStatusBadge(selectedConversation.agent_status)}
          </div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {selectedConversation.phone_number}
            {selectedConversation.area_juridica && ` • ${selectedConversation.area_juridica}`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleIA}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer hover:opacity-80 ${
              selectedConversation.ia_active
                ? 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
                : 'border-orange-300 text-orange-600 bg-orange-50 dark:bg-orange-950/20'
            }`}
            title={selectedConversation.ia_active ? 'Clique para desativar IA e assumir conversa' : 'Clique para reativar IA automática'}
            data-testid="btn-toggle-ia"
          >
            {selectedConversation.ia_active ? (
              <><Bot className="h-3 w-3 mr-1" />IA Ativa</>
            ) : (
              <><User className="h-3 w-3 mr-1" />Atendimento Manual</>
            )}
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <MessageView
        selectedConversation={selectedConversation}
        messages={messages}
        messagesEndRef={messagesEndRef}
      />

      {/* Message Input */}
      <ChatInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
      />
    </div>
  );
};

ChatPanel.displayName = 'ChatPanel';

// ── WhatsAppIA (main) ────────────────────────────────────────────────────────

const WhatsAppIA = () => {
  usePageTitle('WhatsApp');
  const [newMessage, setNewMessage] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [convFilter, setConvFilter] = useState<ConversationFilterState>(EMPTY_CONV_FILTERS);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(() => {
    // Restaura do sessionStorage se disponível
    try {
      const saved = sessionStorage.getItem('whatsapp_kapso_instance');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) {
          return parsed.data?.state === 'connected';
        }
      }
    } catch (err) { console.warn('[WhatsAppIA] session restore failed:', err); }
    return false;
  });
  const { members } = useTeamMembers();
  const connectedManuallyRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Verifica se o WhatsApp está conectado (configuracoes_integracoes) — apenas no mount
  useEffect(() => {
    if (!profile?.tenant_id || connectedManuallyRef.current) return;
    const checkConnection = async () => {
      const { data } = await supabase
        .from('configuracoes_integracoes')
        .select('status')
        .eq('nome_integracao', 'whatsapp_kapso')
        .maybeSingle();
      if (data?.status === 'ativa') {
        setIsWhatsAppConnected(true);
      }
    };
    void checkConnection();
  }, [profile?.tenant_id]);

  const {
    conversations,
    messages,
    loading,
    error,
    isEmpty,
    selectedConversation,
    selectConversation,
    sendMessage,
    sendMedia,
    markAsRead,
    toggleIA,
    fetchConversations,
  } = useWhatsAppConversations();

  // Auto-scroll when new messages arrive
  const prevMsgCount = useRef(0);
  if (messages.length !== prevMsgCount.current) {
    prevMsgCount.current = messages.length;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const uniqueAreas = useMemo(() => {
    const areas = new Set<string>();
    for (const c of conversations) {
      if (c.area_juridica) areas.add(c.area_juridica);
    }
    return Array.from(areas).sort();
  }, [conversations]);

  const stats = useMemo(() => ({
    active: conversations.filter(c => c.status === 'ativo').length,
    qualified: conversations.filter(c => c.status === 'qualificado').length,
    pending: conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0),
    total: conversations.length,
  }), [conversations]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Tab filter
      const tabMatch = (() => {
        switch (convFilter.tab) {
          case 'ia': return conv.agent_status === 'processing' || conv.agent_status === 'waiting_human';
          case 'ativos': return conv.status === 'ativo';
          case 'pendentes': return conv.status === 'aguardando';
          default: return true;
        }
      })();
      // Status filter
      const statusMatch = !convFilter.status || conv.status === convFilter.status;
      // Responsavel filter
      const respMatch = (() => {
        if (!convFilter.responsavelId) return true;
        if (convFilter.responsavelId === '__none__') return !conv.responsavel_id;
        return conv.responsavel_id === convFilter.responsavelId;
      })();
      // Area juridica filter
      const areaMatch = !convFilter.areaJuridica || conv.area_juridica === convFilter.areaJuridica;
      // Search filter
      const searchMatch = !searchQuery.trim() ||
        (conv.contact_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.phone_number.includes(searchQuery);
      return tabMatch && statusMatch && searchMatch && respMatch && areaMatch;
    });
  }, [conversations, convFilter, searchQuery]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;
    void sendMessage(selectedConversation.id, newMessage, 'agent').then((success) => {
      if (success) setNewMessage('');
    });
  };

  const handleSendMedia = (file: File, mediaType: 'image' | 'audio' | 'document') => {
    if (!selectedConversation) return;
    void sendMedia(selectedConversation.id, file, mediaType);
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    void markAsRead(id);
    setShowMobileChat(true);
  };

  // ── Setup screen ──
  if (showSetup) {
    return (
      <WhatsAppSetup
        onConnectionSuccess={() => {
          connectedManuallyRef.current = true;
          setIsWhatsAppConnected(true);
          setShowSetup(false);
          void fetchConversations();
          toast({
            title: 'WhatsApp conectado!',
            description: 'Apenas mensagens recebidas a partir de agora serão sincronizadas.',
          });
        }}
      />
    );
  }

  // ── Loading ──
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

  // ── Error ──
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

  // ── Empty state — só mostra tela de "Conectar" se NÃO está conectado ──
  if (isEmpty && !isWhatsAppConnected) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-center max-w-md">
          <div className="h-24 w-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="h-12 w-12 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">WhatsApp IA Jurídica</h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-2">Gerencie suas conversas e monitore interações</p>
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

  // ── Main layout ──
  return (
    <main aria-label="WhatsApp IA" className="flex h-[calc(100vh-4rem)] bg-[hsl(var(--background))] overflow-hidden">
      <ConversationList
        showMobileChat={showMobileChat}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        convFilter={convFilter}
        onFilterChange={setConvFilter}
        filteredConversations={filteredConversations}
        selectedConversation={selectedConversation}
        stats={stats}
        isConnected={isWhatsAppConnected}
        onSelectConversation={handleSelectConversation}
        onRefresh={() => void fetchConversations()}
        onSetup={() => setShowSetup(true)}
        members={members}
        areasJuridicas={uniqueAreas}
      />
      <ChatPanel
        selectedConversation={selectedConversation}
        showMobileChat={showMobileChat}
        onBack={() => setShowMobileChat(false)}
        messages={messages}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        messagesEndRef={messagesEndRef}
        onSetup={() => setShowSetup(true)}
        onToggleIA={() => selectedConversation && void toggleIA(selectedConversation.id)}
      />
    </main>
  );
};

export default WhatsAppIA;
