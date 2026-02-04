import React from 'react';
import { Brain, Sparkles } from 'lucide-react';

interface ThinkingIndicatorProps {
    message?: string;
    variant?: 'default' | 'compact';
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
    message = 'Analisando sua solicitação...',
    variant = 'default'
}) => {
    const messages = React.useMemo(
        () => [
            'Analisando jurisprudência...',
            'Consultando base de conhecimento...',
            'Processando informações...',
            'Elaborando resposta...',
        ],
        []
    );

    const [currentMessage, setCurrentMessage] = React.useState(message);
    const [messageIndex, setMessageIndex] = React.useState(0);

    React.useEffect(() => {
        if (variant === 'default') {
            const interval = setInterval(() => {
                setMessageIndex((prev) => (prev + 1) % messages.length);
            }, 2000);
            return () => clearInterval(interval);
        }
        return undefined;
    }, [variant, messages.length]);

    React.useEffect(() => {
        if (variant === 'default') {
            setCurrentMessage(messages[messageIndex]);
        }
    }, [messageIndex, messages, variant]);

    if (variant === 'compact') {
        return (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="animate-pulse">{message}</span>
            </div>
        );
    }

    return (
        <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 shadow-sm">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-blue-500 p-3 rounded-full">
                    <Brain className="h-6 w-6 text-white animate-pulse" />
                </div>
            </div>
            <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
                    <span className="font-semibold text-gray-900">Agente IA Pensando</span>
                </div>
                <p className="text-gray-700 animate-pulse transition-all duration-500">
                    {currentMessage}
                </p>
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
};

export default ThinkingIndicator;

