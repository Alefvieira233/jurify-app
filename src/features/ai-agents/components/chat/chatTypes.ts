/**
 * Shared types and constants for AIAssistantChat sub-components.
 */

import React from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  responseTimeMs?: number;
  toolsUsed?: string[];
}

export interface QuickAction {
  label: string;
  icon: React.ReactNode;
  prompt: string;
}
