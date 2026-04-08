/**
 * Chat header with title, clear, expand/collapse, and close controls.
 */

import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Scale, Trash2, Minimize2, Maximize2 } from 'lucide-react';

interface ChatHeaderProps {
  hasMessages: boolean;
  isExpanded: boolean;
  onClear: () => void;
  onToggleExpand: () => void;
  onClose: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  hasMessages,
  isExpanded,
  onClear,
  onToggleExpand,
  onClose,
}) => (
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
        {hasMessages && (
          <Button variant="ghost" size="icon" onClick={onClear} className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20" title="Limpar conversa" aria-label="Limpar conversa">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onToggleExpand} className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20" aria-label={isExpanded ? 'Minimizar chat' : 'Expandir chat'}>
          {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/20" aria-label="Fechar chat">
          <Minimize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  </CardHeader>
);

export default ChatHeader;
