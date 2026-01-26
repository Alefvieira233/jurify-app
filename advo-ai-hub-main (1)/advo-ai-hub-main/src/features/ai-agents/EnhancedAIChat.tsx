import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ThinkingIndicator from '@/components/ui/thinking-indicator';
import TypingText from '@/components/ui/typing-text';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}

interface EnhancedAIChatProps {
    agentId: string;
    agentName: string;
    agentArea?: string;
}

const EnhancedAIChat: React.FC<EnhancedAIChatProps> = ({
    agentId,
    agentName,
    agentArea
}) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const { user, profile } = useAuth();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        const startTime = Date.now();

        try {
            if (!user || !profile?.tenant_id) {
                throw new Error('Usuario nao autenticado');
            }

            const systemPrompt = `Voce e ${agentName}, especialista em ${agentArea || 'direito'}. Responda de forma objetiva e profissional.`;

            const { data, error: functionError } = await supabase.functions.invoke('ai-agent-processor', {
                body: {
                    agentName,
                    agentSpecialization: agentArea || 'Direito',
                    systemPrompt,
                    userPrompt: userMessage.content,
                    tenantId: profile.tenant_id,
                    userId: user.id
                }
            });

            const duration = Date.now() - startTime;

            if (functionError) {
                throw new Error(functionError.message);
            }

            if (!data || !data.result) {
                throw new Error(data?.error || 'Erro ao processar resposta');
            }

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.result || 'Desculpe, não consegui gerar uma resposta.',
                timestamp: new Date(),
                isTyping: true,
            };

            setMessages(prev => [...prev, assistantMessage]);

            toast({
                title: "✅ Resposta recebida",
                description: `Processado em ${duration}ms`,
            });

        } catch (err: any) {
            const errorMessage = err.message || 'Erro ao comunicar com o agente';
            setError(errorMessage);

            toast({
                title: "❌ Erro",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-[600px] bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-sm rounded-t-lg">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                        <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-full">
                            <Bot className="h-5 w-5 text-white" />
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 flex items-center space-x-2">
                            <span>{agentName}</span>
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                        </h3>
                        {agentArea && (
                            <p className="text-xs text-gray-500">{agentArea}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-600">Online</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-6 rounded-full">
                            <Bot className="h-12 w-12 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                                Olá! Sou o {agentName}
                            </h4>
                            <p className="text-gray-600 text-sm max-w-md">
                                Estou aqui para ajudar com questões relacionadas a {agentArea || 'direito'}.
                                Como posso te auxiliar hoje?
                            </p>
                        </div>
                    </div>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-300`}
                    >
                        <div className={`flex items-start space-x-2 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {/* Avatar */}
                            <div className={`flex-shrink-0 ${message.role === 'user' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'} p-2 rounded-full`}>
                                {message.role === 'user' ? (
                                    <User className="h-4 w-4 text-white" />
                                ) : (
                                    <Bot className="h-4 w-4 text-white" />
                                )}
                            </div>

                            {/* Message Bubble */}
                            <div className={`${message.role === 'user' ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' : 'bg-white border shadow-sm'} px-4 py-3 rounded-2xl`}>
                                {message.isTyping ? (
                                    <TypingText
                                        text={message.content}
                                        speed={15}
                                        className={message.role === 'user' ? 'text-white' : 'text-gray-800'}
                                    />
                                ) : (
                                    <p className={`text-sm whitespace-pre-wrap ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                                        {message.content}
                                    </p>
                                )}
                                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-amber-100' : 'text-gray-400'}`}>
                                    {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start animate-in slide-in-from-bottom duration-300">
                        <ThinkingIndicator variant="default" />
                    </div>
                )}

                {error && (
                    <div className="flex justify-center">
                        <Card className="p-4 bg-red-50 border-red-200 max-w-md">
                            <div className="flex items-start space-x-2 text-red-800">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-sm">Erro na comunicação</p>
                                    <p className="text-xs mt-1">{error}</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white/80 backdrop-blur-sm rounded-b-lg">
                <div className="flex items-end space-x-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Digite sua mensagem... (Enter para enviar)"
                        className="flex-1 min-h-[60px] max-h-[120px] resize-none focus:ring-2 focus:ring-blue-500 transition-all"
                        disabled={isLoading}
                    />
                    <Button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 h-[60px] transition-all transform hover:scale-105"
                    >
                        {isLoading ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        ) : (
                            <Send className="h-5 w-5" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Shift + Enter para nova linha
                </p>
            </div>
        </div>
    );
};

export default EnhancedAIChat;
