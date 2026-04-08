/**
 * Single chat message bubble with avatar, content, copy button, and metadata footer.
 * Wrapped in React.memo for list rendering performance.
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Copy, Check, Clock } from 'lucide-react';
import { renderMarkdown } from './chatMarkdown';
import { type Message } from './chatTypes';

// ---------------------------------------------------------------------------
// CopyButton (internal)
// ---------------------------------------------------------------------------

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
      title="Copiar resposta"
      aria-label="Copiar resposta"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// ChatMessage
// ---------------------------------------------------------------------------

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message: msg }) => (
  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`group max-w-[85%] rounded-xl p-2.5 ${
        msg.role === 'user'
          ? 'bg-blue-600 text-white rounded-br-sm'
          : 'bg-muted text-foreground rounded-bl-sm'
      }`}
    >
      {/* Avatar + content */}
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          {msg.role === 'user'
            ? <User className="h-3.5 w-3.5 opacity-70" />
            : <Bot className="h-3.5 w-3.5 text-blue-600" />
          }
        </div>
        <div className="flex-1 min-w-0">
          {msg.role === 'assistant'
            ? renderMarkdown(msg.content)
            : <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
          }
        </div>
        {msg.role === 'assistant' && <CopyButton text={msg.content} />}
      </div>

      {/* Footer: time + tools + response time */}
      <div className="flex items-center gap-2 mt-1.5 text-[10px] opacity-60">
        <span>{formatTime(msg.timestamp)}</span>
        {msg.responseTimeMs && (
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {msg.responseTimeMs < 1000 ? `${msg.responseTimeMs}ms` : `${(msg.responseTimeMs / 1000).toFixed(1)}s`}
          </span>
        )}
        {msg.toolsUsed && msg.toolsUsed.length > 0 && (
          <div className="flex gap-0.5">
            {msg.toolsUsed.map((t) => (
              <Badge key={t} variant="outline" className="text-xs px-1 py-0 h-3.5 border-current">
                {t.replace('search_', '').replace('get_', '').replace('create_', '+')}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
));

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
