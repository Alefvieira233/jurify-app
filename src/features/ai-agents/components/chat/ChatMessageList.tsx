/**
 * Scrollable message list with empty state and typing indicator.
 */

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot } from 'lucide-react';
import { type Message } from './chatTypes';
import ChatMessage from './ChatMessage';
import { ChatSuggestionsGrid } from './ChatSuggestions';

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

const BOUNCE_DELAY_0: React.CSSProperties = { animationDelay: '0ms' };
const BOUNCE_DELAY_150: React.CSSProperties = { animationDelay: '150ms' };
const BOUNCE_DELAY_300: React.CSSProperties = { animationDelay: '300ms' };

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="bg-muted rounded-lg p-3 max-w-[80%]">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-blue-600" />
        <span className="text-xs text-muted-foreground">JurifyBot está pesquisando...</span>
        <div className="flex gap-1 ml-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={BOUNCE_DELAY_0} />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={BOUNCE_DELAY_150} />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={BOUNCE_DELAY_300} />
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// ChatMessageList
// ---------------------------------------------------------------------------

interface ChatMessageListProps {
  messages: Message[];
  isLoading: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  onSendSuggestion: (prompt: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  isLoading,
  scrollRef,
  onSendSuggestion,
}) => (
  <ScrollArea ref={scrollRef} className="flex-1 px-3 py-2">
    <div className="space-y-3">
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="text-center py-6 px-2">
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 mx-auto mb-3 flex items-center justify-center">
            <Bot className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="font-semibold text-base mb-1">Olá! Sou o JurifyBot</h3>
          <p className="text-muted-foreground text-xs mb-4">
            Seu assistente inteligente para o escritório
          </p>

          <ChatSuggestionsGrid onSend={onSendSuggestion} />

          <p className="text-[10px] text-muted-foreground mt-3">
            Ctrl+J para abrir/fechar
          </p>
        </div>
      )}

      {/* Message list */}
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {isLoading && <TypingIndicator />}
    </div>
  </ScrollArea>
);

export default ChatMessageList;
