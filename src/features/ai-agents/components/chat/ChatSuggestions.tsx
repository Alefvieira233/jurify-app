/**
 * Quick-action suggestions displayed as a grid (empty state) or inline bar (active chat).
 */

import React from 'react';
import { QUICK_ACTIONS } from './chatQuickActions';

// ---------------------------------------------------------------------------
// Grid variant (empty state)
// ---------------------------------------------------------------------------

interface SuggestionsGridProps {
  onSend: (prompt: string) => void;
}

export const ChatSuggestionsGrid: React.FC<SuggestionsGridProps> = ({ onSend }) => (
  <div className="grid grid-cols-2 gap-1.5">
    {QUICK_ACTIONS.map((action) => (
      <button
        key={action.label}
        onClick={() => onSend(action.prompt)}
        className="flex items-center gap-1.5 text-xs text-left p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
      >
        <span className="text-blue-600">{action.icon}</span>
        {action.label}
      </button>
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Inline bar variant (active chat)
// ---------------------------------------------------------------------------

interface SuggestionsBarProps {
  onSend: (prompt: string) => void;
}

export const ChatSuggestionsBar: React.FC<SuggestionsBarProps> = ({ onSend }) => (
  <div className="px-3 py-1.5 border-t flex gap-1 overflow-x-auto scrollbar-none">
    {QUICK_ACTIONS.map((a) => (
      <button
        key={a.label}
        onClick={() => onSend(a.prompt)}
        className="flex items-center gap-1 text-[10px] whitespace-nowrap px-2 py-1 rounded-full border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
      >
        {a.icon}
        {a.label}
      </button>
    ))}
  </div>
);
