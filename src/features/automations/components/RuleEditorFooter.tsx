import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SheetFooter } from '@/components/ui/sheet';

interface RuleEditorFooterProps {
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
}

const RuleEditorFooter = ({ onCancel, onSave, isSaving, canSave }: RuleEditorFooterProps) => {
  return (
    <SheetFooter className="px-6 py-4 border-t border-border/10 gap-2">
      <Button
        variant="ghost"
        onClick={onCancel}
        className="rounded-[12px]"
        disabled={isSaving}
      >
        <X className="w-4 h-4 mr-2" />
        Cancelar
      </Button>
      <Button
        onClick={onSave}
        className="rounded-[12px] shadow-lg shadow-primary/20 gap-2"
        disabled={isSaving || !canSave}
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Salvando...' : 'Salvar Regra'}
      </Button>
    </SheetFooter>
  );
};

export default RuleEditorFooter;
