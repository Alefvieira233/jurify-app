import { useState, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
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
  Check,
  CheckCheck,
  Clock,
  Paperclip,
  Mic,
  Square,
  Image,
  FileText,
  X,
} from 'lucide-react';
import { relativeTime, fmtMessageTime } from '@/utils/formatting';
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations';
import type { WhatsAppConversation, WhatsAppMessage, MessageSendStatus } from '@/hooks/useWhatsAppConversations';
import WhatsAppSetup from './WhatsAppSetup';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ConversationFilter = 'todos' | 'ia' | 'ativos' | 'pendentes';

// ── Module-level pure helpers ────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

function getAvatarColor(id: string): string {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? 'bg-emerald-500';
}

function getConvInitials(name: string | null, phone: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    return parts.length > 1
      ? ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
      : first.substring(0, 2).toUpperCase();
  }
  return phone.slice(-2);
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    ativo: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    aguardando: { label: 'Aguardando', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    qualificado: { label: 'Agendado', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    finalizado: { label: 'Finalizado', className: 'bg-muted text-muted-foreground border-border' },
  };
  const badge = map[status] ?? map.finalizado ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badge.className}`}>
      {badge.label}
    </Badge>
  );
}

function getDeliveryStatusIcon(status: MessageSendStatus | undefined) {
  switch (status) {
    case 'pending':
      return <Clock className="h-3 w-3 text-amber-300" />;
    case 'sent':
      return <Check className="h-3 w-3 text-white/60" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-blue-300" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case 'failed':
      return <AlertCircle className="h-3 w-3 text-red-400" />;
    default:
      return <Check className="h-3 w-3 text-white/60" />;
  }
}

function getAgentStatusBadge(agentStatus: string | undefined) {
  if (!agentStatus || agentStatus === 'idle') return null;
  if (agentStatus === 'processing') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 animate-pulse">
        IA processando...
      </Badge>
    );
  }
  if (agentStatus === 'failed') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 bg-red-50 dark:bg-red-950/20">
        Erro IA
      </Badge>
    );
  }
  if (agentStatus === 'waiting_human') {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 bg-amber-50 dark:bg-amber-950/20">
        Aguardando humano
      </Badge>
    );
  }
  return null;
}

// ── ConversationList ─────────────────────────────────────────────────────────

interface ConversationListProps {
  showMobileChat: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeFilter: ConversationFilter;
  setActiveFilter: (f: ConversationFilter) => void;
  filteredConversations: WhatsAppConversation[];
  selectedConversation: WhatsAppConversation | null;
  stats: { total: number; active: number; pending: number; qualified: number };
  isConnected: boolean;
  onSelectConversation: (id: string) => void;
  onRefresh: () => void;
  onSetup: () => void;
}

const ConversationList = ({
  showMobileChat,
  searchQuery,
  setSearchQuery,
  activeFilter,
  setActiveFilter,
  filteredConversations,
  selectedConversation,
  stats,
  isConnected,
  onSelectConversation,
  onRefresh,
  onSetup,
}: ConversationListProps) => (
  <div
    className={`flex flex-col h-full border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}
    style={{ width: '100%', maxWidth: '400px', minWidth: '320px' }}
  >
    {/* Header */}
    <div className="p-4 border-b border-[hsl(var(--border))]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[hsl(var(--foreground))]">Conversas</h2>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSetup} aria-label="Configurações WhatsApp">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRefresh} aria-label="Atualizar conversas">
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
        <TabsList className="w-full grid grid-cols-4 h-8">
          <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
          <TabsTrigger value="ia" className="text-xs">IA</TabsTrigger>
          <TabsTrigger value="ativos" className="text-xs">Ativos</TabsTrigger>
          <TabsTrigger value="pendentes" className="text-xs">Pendentes</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>

    {/* Filter bar */}
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
      <select
        className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
        defaultValue=""
      >
        <option value="">Responsável</option>
      </select>
      <select
        className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
        defaultValue=""
      >
        <option value="">Status</option>
        <option value="ativo">Ativo</option>
        <option value="pendente">Pendente</option>
        <option value="finalizado">Finalizado</option>
      </select>
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
              onClick={() => onSelectConversation(conv.id)}
              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[hsl(var(--border))]/50 ${
                isSelected
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-l-2 border-l-emerald-500'
                  : 'hover:bg-[hsl(var(--muted))]/50 border-l-2 border-l-transparent'
              }`}
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`h-11 w-11 rounded-full ${getAvatarColor(conv.id)} flex items-center justify-center text-white text-sm font-semibold`}>
                  {getConvInitials(conv.contact_name, conv.phone_number)}
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
                    {conv.last_message_at ? relativeTime(conv.last_message_at) : ''}
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
        <span className="flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {isConnected ? 'Conectado' : 'Desconectado'}
        </span>
        <span>{stats.total} conversas</span>
        <span>{stats.active} ativos</span>
        <span>{stats.pending} pendentes</span>
      </div>
    </div>
  </div>
);

ConversationList.displayName = 'ConversationList';

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
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Close attach menu on click outside
  useEffect(() => {
    if (!showAttachMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAttachMenu]);

  const handleFileSelect = (accept: string, mediaType: 'image' | 'document') => {
    setShowAttachMenu(false);
    const input = fileInputRef.current;
    if (!input) return;
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          alert('Arquivo muito grande. Máximo: 10MB');
          return;
        }
        onSendMedia(file, mediaType);
      }
      input.value = '';
    };
    input.click();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        onSendMedia(file, 'audio');
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch {
      alert('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
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
      <ScrollArea className="flex-1 px-4 py-3 bg-[#efeae2] dark:bg-[#0b141a]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23d1d5db15\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}>
        <div className="space-y-3 max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Nenhuma mensagem ainda</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const isLead = message.sender === 'lead';
                const isIA = message.sender === 'ia';

                // Date separator
                const messageDate = new Date(message.timestamp).toLocaleDateString('pt-BR');
                const prevMsg = index > 0 ? messages[index - 1] : undefined;
                const prevDate = prevMsg ? new Date(prevMsg.timestamp).toLocaleDateString('pt-BR') : null;
                const showDateSeparator = index === 0 || messageDate !== prevDate;

                // Check if today/yesterday
                const today = new Date().toLocaleDateString('pt-BR');
                const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('pt-BR');
                const dateLabel = messageDate === today ? 'Hoje' : messageDate === yesterday ? 'Ontem' : messageDate;

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <span className="text-[11px] text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-3 py-1 rounded-md shadow-sm">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isLead ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                        isLead
                          ? 'bg-white dark:bg-[#202c33] border border-[hsl(var(--border))]/30 rounded-tl-none'
                          : isIA
                            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[hsl(var(--foreground))] dark:text-white rounded-tr-none'
                            : 'bg-[#d4e4fa] dark:bg-[#1f3a5f] text-[hsl(var(--foreground))] dark:text-white rounded-tr-none'
                      }`}>
                        {isIA && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <Bot className="h-3 w-3 text-emerald-600 dark:text-emerald-300" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium">IA Jurídica</span>
                          </div>
                        )}
                        {!isLead && !isIA && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <User className="h-3 w-3 text-blue-600 dark:text-blue-300" />
                            <span className="text-[10px] text-blue-600 dark:text-blue-300 font-medium">Você</span>
                          </div>
                        )}
                        {/* Media content rendering */}
                        {message.message_type === 'image' && message.media_url ? (
                          <img src={message.media_url} alt="Imagem" className="max-w-full rounded-md mb-1" loading="lazy" />
                        ) : message.message_type === 'audio' && message.media_url ? (
                          <audio controls src={message.media_url} className="max-w-full mb-1" preload="none" />
                        ) : message.message_type === 'document' && message.media_url ? (
                          <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 underline mb-1">
                            <FileText className="h-4 w-4" />
                            {message.content || 'Documento'}
                          </a>
                        ) : null}
                        <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>
                        {!isLead && message.send_status === 'failed' && message.send_error && (
                          <p className="text-[10px] mt-1 text-red-500 dark:text-red-400">Falha no envio</p>
                        )}
                        <div className={`flex items-center justify-end gap-1 mt-1 ${isLead ? 'text-[hsl(var(--muted-foreground))]' : 'text-[hsl(var(--muted-foreground))] dark:text-white/60'}`}>
                          <span className="text-[10px]">{fmtMessageTime(message.timestamp)}</span>
                          {!isLead && getDeliveryStatusIcon(message.send_status)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {/* Typing/Processing Indicator */}
          {selectedConversation.ia_active && selectedConversation.agent_status === 'processing' && (
            <div className="flex justify-start">
              <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%]">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="px-4 py-3 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <input type="file" ref={fileInputRef} className="hidden" aria-label="Selecionar arquivo" />
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          {/* Attachment button */}
          <div className="relative" ref={attachMenuRef}>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              aria-label="Anexar arquivo"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            {showAttachMenu && (
              <div className="absolute bottom-12 left-0 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                <button
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  onClick={() => handleFileSelect('image/*', 'image')}
                >
                  <Image className="h-4 w-4 text-blue-500" />
                  Imagem
                </button>
                <button
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
                  onClick={() => handleFileSelect('.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv', 'document')}
                >
                  <FileText className="h-4 w-4 text-purple-500" />
                  Documento
                </button>
              </div>
            )}
          </div>

          {isRecording ? (
            /* Recording UI */
            <div className="flex-1 flex items-center gap-3 min-h-[40px] py-2.5 px-3 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {formatRecordingTime(recordingTime)}
              </span>
              <span className="text-xs text-red-500/70">Gravando...</span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[hsl(var(--muted-foreground))] hover:text-red-500"
                onClick={cancelRecording}
                aria-label="Cancelar gravação"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            /* Text input */
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder="Digite uma mensagem..."
              className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-3 text-sm rounded-md border border-input bg-background resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              rows={1}
            />
          )}

          {/* Send or Mic button */}
          {isRecording ? (
            <Button
              onClick={stopRecording}
              size="icon"
              className="h-10 w-10 bg-red-500 hover:bg-red-600"
              aria-label="Parar e enviar áudio"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          ) : newMessage.trim() ? (
            <Button
              onClick={onSendMessage}
              size="icon"
              className="h-10 w-10 bg-emerald-600 hover:bg-emerald-700"
              aria-label="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => void startRecording()}
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-[hsl(var(--muted-foreground))] hover:text-emerald-600"
              aria-label="Gravar áudio"
            >
              <Mic className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
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
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('todos');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(() => {
    // Restaura do sessionStorage se disponível
    try {
      const saved = sessionStorage.getItem('whatsapp_evolution_instance');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timestamp && Date.now() - parsed.timestamp < 2 * 60 * 60 * 1000) {
          return parsed.data?.state === 'connected';
        }
      }
    } catch { /* ignore */ }
    return false;
  });
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
        .eq('nome_integracao', 'whatsapp_evolution')
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

  const stats = useMemo(() => ({
    active: conversations.filter(c => c.status === 'ativo').length,
    qualified: conversations.filter(c => c.status === 'qualificado').length,
    pending: conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0),
    total: conversations.length,
  }), [conversations]);

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
    if (activeFilter === 'ia') {
      filtered = filtered.filter(c => (c as WhatsAppConversation & { respondido_por_ia?: boolean }).respondido_por_ia === true || c.status === 'ia');
    } else if (activeFilter === 'ativos') {
      filtered = filtered.filter(c => c.status === 'ativo' || c.status === 'Ativo');
    } else if (activeFilter === 'pendentes') {
      filtered = filtered.filter(c => c.status === 'aguardando' || c.status === 'pendente' || c.status === 'Aguardando');
    }
    return filtered;
  }, [conversations, searchQuery, activeFilter]);

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
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        filteredConversations={filteredConversations}
        selectedConversation={selectedConversation}
        stats={stats}
        isConnected={isWhatsAppConnected}
        onSelectConversation={handleSelectConversation}
        onRefresh={() => void fetchConversations()}
        onSetup={() => setShowSetup(true)}
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
