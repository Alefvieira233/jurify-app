import { useRef, useCallback, type RefObject } from 'react';
import {
  Bot,
  User,
  FileText,
} from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fmtMessageTime } from '@/utils/formatting';
import type { WhatsAppConversation, WhatsAppMessage } from '@/hooks/useWhatsAppConversations';
import { getDeliveryStatusIcon } from './whatsapp-helpers';

export interface MessageViewProps {
  selectedConversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  messagesEndRef: RefObject<HTMLDivElement>;
}

const VIRTUALIZE_THRESHOLD = 50;

/** Render a single message row (shared between virtualized and non-virtualized paths) */
function MessageRow({
  message,
  messages,
  index,
}: {
  message: WhatsAppMessage;
  messages: WhatsAppMessage[];
  index: number;
}) {
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
    <div>
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
              <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-medium">IA Juridica</span>
            </div>
          )}
          {!isLead && !isIA && (
            <div className="flex items-center gap-1 mb-0.5">
              <User className="h-3 w-3 text-blue-600 dark:text-blue-300" />
              <span className="text-[10px] text-blue-600 dark:text-blue-300 font-medium">Voce</span>
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
}

/** Virtualized message list for large conversations (50+ messages) */
function VirtualizedMessageList({
  messages,
  messagesEndRef,
}: {
  messages: WhatsAppMessage[];
  messagesEndRef: RefObject<HTMLDivElement>;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => 80, []),
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto px-4 py-3 bg-[#efeae2] dark:bg-[#0b141a]"
      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23d1d5db15\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}
    >
      <div className="max-w-3xl mx-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const msg = messages[virtualRow.index];
            if (!msg) return null;
            return (
              <div
                key={msg.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="py-1.5"
              >
                <MessageRow
                  message={msg}
                  messages={messages}
                  index={virtualRow.index}
                />
              </div>
            );
          })}
        </div>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

const MessageView = ({
  selectedConversation,
  messages,
  messagesEndRef,
}: MessageViewProps) => {
  const useVirtual = messages.length > VIRTUALIZE_THRESHOLD;

  if (messages.length === 0) {
    return (
      <div className="flex-1 px-4 py-3 bg-[#efeae2] dark:bg-[#0b141a]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23d1d5db15\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}>
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Nenhuma mensagem ainda</p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  if (useVirtual) {
    return (
      <>
        <VirtualizedMessageList messages={messages} messagesEndRef={messagesEndRef} />
        {/* Typing/Processing Indicator */}
        {selectedConversation.ia_active && selectedConversation.agent_status === 'processing' && (
          <div className="flex justify-start px-4 pb-3 bg-[#efeae2] dark:bg-[#0b141a]">
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl rounded-bl-md px-4 py-3 max-w-[75%]">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Small list: render normally without virtualization
  return (
    <div className="flex-1 overflow-auto px-4 py-3 bg-[#efeae2] dark:bg-[#0b141a]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M0 20h40M20 0v40\' stroke=\'%23d1d5db15\' fill=\'none\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}>
      <div className="space-y-3 max-w-3xl mx-auto">
        {messages.map((message, index) => (
          <MessageRow key={message.id} message={message} messages={messages} index={index} />
        ))}
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
    </div>
  );
};

MessageView.displayName = 'MessageView';

export default MessageView;
