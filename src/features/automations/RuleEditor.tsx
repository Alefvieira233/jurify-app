import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { AutomationRule } from './types';
import RuleConditionEditor from './RuleConditionEditor';
import RuleActionEditor from './RuleActionEditor';
import RuleEditorHeader from './components/RuleEditorHeader';
import RuleEditorFooter from './components/RuleEditorFooter';
import RuleBasicInfoSection from './components/RuleBasicInfoSection';
import { useRuleEditorForm } from './components/useRuleEditorForm';

// ── Props ──

interface RuleEditorProps {
  open: boolean;
  rule: AutomationRule | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── Component ──

const RuleEditor = ({ open, rule, onClose, onSaved }: RuleEditorProps) => {
  const {
    isEditing,
    nome,
    setNome,
    descricao,
    setDescricao,
    evento,
    setEvento,
    matchLogic,
    setMatchLogic,
    conditions,
    addCondition,
    removeCondition,
    updateCondition,
    actions,
    addAction,
    removeAction,
    updateActionType,
    updateActionConfig,
    handleSave,
    isSaving,
  } = useRuleEditorForm({ open, rule, onSaved });

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 bg-background/95 backdrop-blur-xl border-border/10 flex flex-col"
      >
        <RuleEditorHeader isEditing={isEditing} />

        {/* Scrollable Body */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-8 py-6">
            <RuleBasicInfoSection
              nome={nome}
              onNomeChange={setNome}
              descricao={descricao}
              onDescricaoChange={setDescricao}
              evento={evento}
              onEventoChange={setEvento}
              matchLogic={matchLogic}
              onMatchLogicChange={setMatchLogic}
            />

            <RuleConditionEditor
              conditions={conditions}
              onAdd={addCondition}
              onRemove={removeCondition}
              onUpdate={updateCondition}
            />

            <RuleActionEditor
              actions={actions}
              onAdd={addAction}
              onRemove={removeAction}
              onUpdateType={updateActionType}
              onUpdateConfig={updateActionConfig}
            />
          </div>
        </ScrollArea>

        <RuleEditorFooter
          onCancel={onClose}
          onSave={handleSave}
          isSaving={isSaving}
          canSave={!!nome.trim() && !!evento}
        />
      </SheetContent>
    </Sheet>
  );
};

export default RuleEditor;
