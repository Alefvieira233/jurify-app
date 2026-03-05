/**
 * 🤖 AI Assistant Chat — Enterprise v2
 *
 * Features: markdown rendering, quick actions, copy button,
 * response time indicator, tools badge, keyboard shortcuts.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Send, User, Users, FileText, TrendingUp,
  Copy, Check, Trash2, Minimize2, Maximize2,
  BarChart3, Scale, Clock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTimeMs?: number;
  toolsUsed?: string[];
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Clientes recentes', icon: <Users className="h-3 w-3" />, prompt: 'Me mostre os leads mais recentes' },
  { label: 'Contratos', icon: <FileText className="h-3 w-3" />, prompt: 'Quais contratos foram assinados recentemente?' },
  { label: 'Métricas do mês', icon: <BarChart3 className="h-3 w-3" />, prompt: 'Me dê um resumo das métricas deste mês' },
  { label: 'Taxa de conversão', icon: <TrendingUp className="h-3 w-3" />, prompt: 'Qual a taxa de conversão atual de leads?' },
];

// ---------------------------------------------------------------------------
// Markdown renderer (lightweight — no external deps)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    // Headings
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="font-semibold text-sm mt-2 mb-1">{processInline(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-bold text-sm mt-2 mb-1">{processInline(line.slice(3))}</h3>);
      continue;
    }

    // List items
    if (/^[-*]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex items-start gap-1.5 text-sm">
          <span className="text-muted-foreground mt-0.5">•</span>
          <span>{processInline(line.replace(/^[-*]\s/, ''))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-1.5 text-sm">
          <span className="text-muted-foreground font-medium mt-0.5 min-w-[1rem]">{num}.</span>
          <span>{processInline(line.replace(/^\d+\.\s/, ''))}</span>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1" />);
      continue;
    }

    // Normal paragraph
    elements.push(<p key={i} className="text-sm">{processInline(line)}</p>);
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function processInline(text: string): React.ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    // Inline code `text`
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith('`') && cp.endsWith('`')) {
        return <code key={`${i}-${j}`} className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono">{cp.slice(1, -1)}</code>;
      }
      return <React.Fragment key={`${i}-${j}`}>{cp}</React.Fragment>;
    });
  });
}

// ---------------------------------------------------------------------------
// Sub-components
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

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="bg-muted rounded-lg p-3 max-w-[80%]">
      <div className="flex items-center gap-2">
        <Bot className="h-4 w-4 text-blue-600" />
        <span className="text-xs text-muted-foreground">JurifyBot está pesquisando...</span>
        <div className="flex gap-1 ml-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AIAssistantChat: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isLoadingRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const vp = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (vp) vp.scrollTop = vp.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Keyboard shortcut: Ctrl+J to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !user || isLoadingRef.current) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      const session = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('assistant', {
        body: { message: userMsg.content, userId: user.id },
        headers: { Authorization: `Bearer ${session.data.session?.access_token}` },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data?.response ?? 'Desculpe, não consegui processar sua solicitação.',
        timestamp: new Date(),
        responseTimeMs: data?.response_time_ms,
        toolsUsed: data?.tools_used,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (_err) {
      const assistantMsg: Message = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns segundos.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      toast({
        title: 'Erro no assistente',
        description: 'Não foi possível processar sua mensagem.',
        variant: 'destructive',
      });
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [user, toast]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const clearChat = () => setMessages([]);

  const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // ── Closed state ──
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl rounded-full h-14 w-14 p-0 sm:w-auto sm:px-5 sm:rounded-lg"
          title="JurifyBot (Ctrl+J)"
        >
          <Bot className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline font-semibold">JurifyBot</span>
        </Button>
      </div>
    );
  }

  const chatWidth = isExpanded ? 'w-[480px]' : 'w-96';
  const chatHeight = isExpanded ? 'h-[700px]' : 'h-[560px]';

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${chatWidth} ${chatHeight} transition-all duration-200`}>
      <Card className="h-full flex flex-col shadow-2xl border-border/50 backdrop-blur">
        {/* ── Header ── */}
        <CardHeader className="pb-2 pt-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Scale className="h-3.5 w-3.5" />
              </div>
              JurifyBot
              <Badge variant="secondary" className="text-[10px] bg-white/20 text-white border-0 px-1.5 py-0">
                IA
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <Button variant="ghost" size="icon" onClick={clearChat} className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20" title="Limpar conversa" aria-label="Limpar conversa">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20" aria-label={isExpanded ? 'Minimizar chat' : 'Expandir chat'}>
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20" aria-label="Fechar chat">
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          {/* ── Messages ── */}
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

                  {/* Quick actions */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => { void sendMessage(action.prompt); }}
                        className="flex items-center gap-1.5 text-xs text-left p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-blue-600">{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-muted-foreground mt-3">
                    Ctrl+J para abrir/fechar
                  </p>
                </div>
              )}

              {/* Message list */}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                            <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-current">
                              {t.replace('search_', '').replace('get_', '').replace('create_', '+')}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && <TypingIndicator />}
            </div>
          </ScrollArea>

          {/* ── Quick actions row (when has messages) ── */}
          {messages.length > 0 && !isLoading && (
            <div className="px-3 py-1.5 border-t flex gap-1 overflow-x-auto scrollbar-none">
              {QUICK_ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => { void sendMessage(a.prompt); }}
                  className="flex items-center gap-1 text-[10px] whitespace-nowrap px-2 py-1 rounded-full border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {a.icon}
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Input ── */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte sobre leads, contratos..."
                disabled={isLoading}
                className="flex-1 text-sm h-9"
              />
              <Button
                onClick={() => { void sendMessage(input); }}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-9 w-9"
                aria-label="Enviar mensagem"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIAssistantChat;
