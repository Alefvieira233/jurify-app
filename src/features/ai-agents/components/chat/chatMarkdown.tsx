/**
 * Lightweight markdown renderer (no external deps).
 */

import React from 'react';

function processInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith('`') && cp.endsWith('`')) {
        return (
          <code key={`${i}-${j}`} className="bg-muted/50 px-1 py-0.5 rounded text-xs font-mono">
            {cp.slice(1, -1)}
          </code>
        );
      }
      return <React.Fragment key={`${i}-${j}`}>{cp}</React.Fragment>;
    });
  });
}

export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="font-semibold text-sm mt-2 mb-1">{processInline(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-bold text-sm mt-2 mb-1">{processInline(line.slice(3))}</h3>);
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      elements.push(
        <div key={i} className="flex items-start gap-1.5 text-sm">
          <span className="text-muted-foreground mt-0.5">•</span>
          <span>{processInline(line.replace(/^[-*]\s/, ''))}</span>
        </div>
      );
      continue;
    }

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

    if (!line.trim()) {
      elements.push(<div key={i} className="h-1" />);
      continue;
    }

    elements.push(<p key={i} className="text-sm">{processInline(line)}</p>);
  }

  return <div className="space-y-0.5">{elements}</div>;
}
