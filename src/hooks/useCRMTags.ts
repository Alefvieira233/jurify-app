/**
 * @deprecated Use useTags and useLeadTags from '@/hooks/useTags' instead.
 * This file is kept only for backward compatibility and will be removed.
 */
import { useTags } from './useTags';
import type { Tag as UnifiedTag } from '@/types/crm-operacional';

export type Tag = {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
};

function mapTag(t: UnifiedTag): Tag {
  return { id: t.id, tenant_id: t.tenant_id, name: t.nome, color: t.cor };
}

export const useCRMTags = () => {
  const { tags: rawTags, isLoading } = useTags();
  return {
    tags: rawTags.map(mapTag),
    loading: isLoading,
    fetchTags: () => { /* noop — React Query handles fetching */ },
    createTag: (_name: string, _color?: string) => Promise.resolve(false),
    deleteTag: (_id: string) => Promise.resolve(false),
    addTagToLead: (_leadId: string, _tagId: string) => Promise.resolve(false),
    removeTagFromLead: (_leadId: string, _tagId: string) => Promise.resolve(false),
    getLeadTags: (_leadId: string): Promise<Tag[]> => Promise.resolve([]),
  };
};
