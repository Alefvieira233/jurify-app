import { Zap } from 'lucide-react';
import { SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface RuleEditorHeaderProps {
  isEditing: boolean;
}

const RuleEditorHeader = ({ isEditing }: RuleEditorHeaderProps) => {
  return (
    <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[12px] bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <SheetTitle className="text-lg">
            {isEditing ? 'Editar Regra' : 'Nova Regra'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Modifique as condições e ações desta regra.'
              : 'Defina quando e como a automação deve agir.'}
          </SheetDescription>
        </div>
      </div>
    </SheetHeader>
  );
};

export default RuleEditorHeader;
