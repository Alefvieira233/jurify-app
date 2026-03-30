import type { RefObject } from 'react';
import {
  Bot,
  User,
  FileText,
} from 'lucide-react';
import { fmtMessageTime } from '@/utils/formatting';
import type { WhatsAppConversation, WhatsAppMessage } from '@/hooks/useWhatsAppConversations';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDeliveryStatusIcon } from './whatsapp-helpers';

export interface MessageViewProps {
  selectedConversation: WhatsAppConversation;
  messages: WhatsAppMessage[];
  messagesEndRef: RefObject<HTMLDivElement>;
}

const MessageView = ({
  selectedConversation,
  messages,
  messagesEndRef,
}: MessageViewProps) => (
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
);

MessageView.displayName = 'MessageView';

export default MessageView;
