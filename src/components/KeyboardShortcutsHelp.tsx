import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Busca global' },
  { keys: ['Ctrl', 'D'], description: 'Dashboard' },
  { keys: ['Ctrl', 'L'], description: 'Leads' },
  { keys: ['Ctrl', 'A'], description: 'Agendamentos' },
  { keys: ['Ctrl', 'P'], description: 'Pipeline' },
  { keys: ['Esc'], description: 'Fechar menu / busca' },
];

export const KeyboardShortcutsHelp = ({ open, onOpenChange }: KeyboardShortcutsHelpProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de Teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-1.5 px-1"
            >
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-[10px] text-muted-foreground/50">+</span>
                    )}
                    <kbd className="px-2 py-1 text-xs font-mono font-medium bg-muted border border-border rounded-md text-foreground shadow-sm min-w-[28px] text-center">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;
