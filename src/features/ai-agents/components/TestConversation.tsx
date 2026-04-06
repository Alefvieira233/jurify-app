import React from 'react';
import { Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExecutionLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

interface TestConversationProps {
  logs: ExecutionLog[];
  isExecuting: boolean;
}

function getLogIcon(level: ExecutionLog['level']) {
  switch (level) {
    case 'success': return 'V';
    case 'error': return 'X';
    case 'warning': return '!';
    default: return 'i';
  }
}

function getLogColor(level: ExecutionLog['level']) {
  switch (level) {
    case 'success': return 'text-green-600';
    case 'error': return 'text-red-600';
    case 'warning': return 'text-yellow-600';
    default: return 'text-blue-600';
  }
}

export const TestConversation: React.FC<TestConversationProps> = ({ logs, isExecuting }) => {
  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="h-5 w-5" />
          <span>Logs de Execucao em Tempo Real</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="flex items-start space-x-2 mb-1">
              <span className="text-muted-foreground">[{log.timestamp}]</span>
              <span className={getLogColor(log.level)}>
                {getLogIcon(log.level)} {log.message}
              </span>
            </div>
          ))}
          {isExecuting && (
            <div className="flex items-center space-x-2 animate-pulse">
              <span className="text-muted-foreground">[{new Date().toLocaleTimeString('pt-BR')}]</span>
              <span className="text-yellow-400">Aguardando resposta do N8N...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
