/**
 * RealTimeTerminal — live system logs display for Mission Control.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentLog } from '../hooks/useRealtimeAgents';

interface RealTimeTerminalProps {
  logs: AgentLog[];
}

export function RealTimeTerminal({ logs }: RealTimeTerminalProps) {
  const [autoScroll, setAutoScroll] = useState(true);

  return (
    <Card className="bg-slate-950 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-green-500" />
            <CardTitle className="text-sm font-mono text-green-500">System Logs</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoScroll(!autoScroll)}
              className="h-7 text-xs text-slate-500 dark:text-slate-400 hover:text-white"
            >
              Auto-scroll: {autoScroll ? 'ON' : 'OFF'}
            </Button>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-slate-500">Aguardando logs...</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className={cn(
                  'py-1 px-2 rounded',
                  log.status === 'failed' && 'bg-red-950/30 text-red-400',
                  log.status === 'completed' && 'text-green-400',
                  log.status === 'processing' && 'text-blue-400 bg-blue-950/20',
                  log.status === 'pending' && 'text-slate-500 dark:text-slate-400'
                )}>
                  <span className="text-slate-500">
                    [{new Date(log.created_at).toLocaleTimeString()}]
                  </span>
                  {' '}
                  <span className="text-purple-400">{log.agent_name}</span>
                  {' '}
                  <span className={cn(
                    log.status === 'completed' && 'text-green-500',
                    log.status === 'failed' && 'text-red-500',
                    log.status === 'processing' && 'text-blue-500',
                    log.status === 'pending' && 'text-yellow-500'
                  )}>
                    [{(log.status ?? 'unknown').toUpperCase()}]
                  </span>
                  {' '}
                  {log.result_preview && (
                    <span className="text-slate-300">
                      {log.result_preview.substring(0, 100)}
                      {log.result_preview.length > 100 && '...'}
                    </span>
                  )}
                  {log.error_message && (
                    <span className="text-red-400"> ERROR: {log.error_message}</span>
                  )}
                  {' '}
                  <span className="text-slate-600">
                    ({log.total_tokens} tokens, {log.latency_ms}ms)
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
