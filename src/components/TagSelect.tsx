import { useState } from 'react';
import { Check, ChevronsUpDown, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTags } from '@/hooks/useTags';
import { TagBadge } from '@/features/tags/TagBadge';

interface TagSelectProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  leadId?: string;
}

export function TagSelect({ selectedTagIds, onChange }: TagSelectProps) {
  const { tags, isLoading } = useTags();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTags = tags.filter((tag) =>
    tag.nome.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto min-h-9"
        >
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedTags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  nome={tag.nome}
                  cor={tag.cor}
                  size="sm"
                  onRemove={() => { toggleTag(tag.id); }}
                />
              ))}
            </div>
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Tags className="w-4 h-4" />
              Adicionar tags
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Buscar tag..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="h-8"
          />
        </div>
        <div className="max-h-[200px] overflow-y-auto p-1">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Carregando...
            </p>
          ) : filteredTags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma tag encontrada
            </p>
          ) : (
            filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => { toggleTag(tag.id); }}
                  className={cn(
                    'flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors',
                    isSelected && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      'w-4 h-4 shrink-0',
                      isSelected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <TagBadge nome={tag.nome} cor={tag.cor} size="sm" />
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default TagSelect;
