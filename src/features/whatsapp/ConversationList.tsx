import {
  MessageSquare,
  Settings,
  Search,
  RefreshCw,
} from 'lucide-react';
import { relativeTime } from '@/utils/formatting';
import type { WhatsAppConversation } from '@/hooks/useWhatsAppConversations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import ConversationFilters from './ConversationFilters';
import type { ConversationFilterState } from './conversationFilterTypes';
import { getAvatarColor, getConvInitials, getStatusBadge } from './whatsapp-helpers';

export interface ConversationListProps {
  showMobileChat: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  convFilter: ConversationFilterState;
  onFilterChange: (next: ConversationFilterState) => void;
  filteredConversations: WhatsAppConversation[];
  selectedConversation: WhatsAppConversation | null;
  stats: { total: number; active: number; pending: number; qualified: number };
  isConnected: boolean;
  onSelectConversation: (id: string) => void;
  onRefresh: () => void;
  onSetup: () => void;
  members: { id: string; nome_completo: string | null }[];
  areasJuridicas: string[];
}

const ConversationList = ({
  showMobileChat,
  searchQuery,
  setSearchQuery,
  convFilter,
  onFilterChange,
  filteredConversations,
  selectedConversation,
  stats,
  isConnected,
  onSelectConversation,
  onRefresh,
  onSetup,
  members,
  areasJuridicas,
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

    </div>

    <ConversationFilters value={convFilter} onChange={onFilterChange} stats={stats} members={members} areasJuridicas={areasJuridicas} />

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

export default ConversationList;
