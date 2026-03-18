import { X } from 'lucide-react';

interface TagBadgeProps {
  nome: string;
  cor: string;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}

export function TagBadge({ nome, cor, size = 'md', onRemove }: TagBadgeProps) {
  const textClass = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium ${textClass}`}
      style={{ backgroundColor: `${cor}20` }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: cor }}
      />
      <span className="truncate max-w-[120px]">{nome}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
          aria-label={`Remover tag ${nome}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export default TagBadge;
