/* eslint-disable react-refresh/only-export-components */
import { useState, useMemo, useCallback } from 'react';
import { Plus, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import RuleEditor from './RuleEditor';
import { RuleCard } from './RuleCard';
import { RegrasToolbar } from './RegrasToolbar';
import { RegrasLoadingSkeleton } from './RegrasLoadingSkeleton';
import { useRegrasData } from './useRegrasData';
import type { AutomationRule } from './types';

// Re-export for backward compatibility
export type { AutomationRule } from './types';
export { EVENT_TYPE_LABELS } from './types';

// ── Component ──

export const RegrasManager = () => {
  usePageTitle('Regras de Automacao');

  const {
    isLoading,
    error,
    refetch,
    toggleMutation,
    deleteMutation,
    filterRules,
    handleToggleStatus,
    invalidateRules,
  } = useRegrasData();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterEvento, setFilterEvento] = useState<string>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; label: string }>({
    open: false, id: '', label: '',
  });

  const filteredRules = useMemo(
    () => filterRules(searchTerm, filterStatus, filterEvento),
    [filterRules, searchTerm, filterStatus, filterEvento]
  );

  // ── Handlers ──

  const handleNewRule = useCallback(() => {
    setEditingRule(null);
    setEditorOpen(true);
  }, []);

  const handleEditRule = useCallback((rule: AutomationRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  }, []);

  const handleEditorClose = useCallback(() => {
    setEditorOpen(false);
    setEditingRule(null);
  }, []);

  const handleEditorSaved = useCallback(() => {
    handleEditorClose();
    invalidateRules();
  }, [handleEditorClose, invalidateRules]);

  const handleDeleteRequest = useCallback((id: string, label: string) => {
    setConfirmDelete({ open: true, id, label });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    void deleteMutation.mutateAsync(confirmDelete.id).then(() => {
      setConfirmDelete({ open: false, id: '', label: '' });
    });
  }, [deleteMutation, confirmDelete.id]);

  const handleDeleteCancel = useCallback((open: boolean) => {
    if (!open) setConfirmDelete({ open: false, id: '', label: '' });
  }, []);

  // ── Render ──

  if (isLoading) return <RegrasLoadingSkeleton />;

  if (error) {
    return (
      <div className="space-y-8 pb-12">
        <ErrorState title="Erro ao carregar regras de automacao" onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Regras de Automacao</h1>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider border border-primary/20">
              Motor de Regras
            </span>
          </div>
          <p className="text-muted-foreground">
            Configure regras automaticas de se/entao para processar leads, notificacoes e fluxos do escritorio.
          </p>
        </div>
        <Button onClick={handleNewRule} className="rounded-[12px] shadow-lg shadow-primary/20 gap-2">
          <Plus className="w-4 h-4" />
          Nova Regra
        </Button>
      </div>

      {/* Filters */}
      <RegrasToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterEvento={filterEvento}
        onFilterEventoChange={setFilterEvento}
      />

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Nenhuma regra configurada"
          description="Crie regras de automacao para executar acoes automaticamente quando eventos acontecerem no seu escritorio."
          action={{ label: 'Criar primeira regra', onClick: handleNewRule }}
        />
      ) : (
        <div className="space-y-4">
          {filteredRules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRequest}
              onToggleStatus={handleToggleStatus}
              togglePending={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Rule Editor */}
      <RuleEditor open={editorOpen} rule={editingRule} onClose={handleEditorClose} onSaved={handleEditorSaved} />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={handleDeleteCancel}
        title="Excluir regra"
        description={`Tem certeza que deseja excluir a regra "${confirmDelete.label}"? Esta acao e irreversivel e removera todas as condicoes e acoes associadas.`}
        destructive
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default RegrasManager;
