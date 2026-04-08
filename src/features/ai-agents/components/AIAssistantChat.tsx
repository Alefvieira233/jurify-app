/**
 * AI Assistant Chat — Enterprise v2
 *
 * Parent component that composes ChatHeader, ChatMessageList,
 * ChatSuggestions, and the input area.
 *
 * Features: markdown rendering, quick actions, copy button,
 * response time indicator, tools badge, keyboard shortcuts.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { type Message } from './chat/chatTypes';
import ChatHeader from './chat/ChatHeader';
import ChatMessageList from './chat/ChatMessageList';
import { ChatSuggestionsBar } from './chat/ChatSuggestions';

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

  const handleSendSuggestion = useCallback((prompt: string) => {
    void sendMessage(prompt);
  }, [sendMessage]);

  const clearChat = () => setMessages([]);

  // Closed state
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
        <ChatHeader
          hasMessages={messages.length > 0}
          isExpanded={isExpanded}
          onClear={clearChat}
          onToggleExpand={() => setIsExpanded(!isExpanded)}
          onClose={() => setIsOpen(false)}
        />

        <CardContent className="flex-1 p-0 flex flex-col min-h-0">
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            scrollRef={scrollRef}
            onSendSuggestion={handleSendSuggestion}
          />

          {messages.length > 0 && !isLoading && (
            <ChatSuggestionsBar onSend={handleSendSuggestion} />
          )}

          {/* Input */}
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
