import { Copy, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ApiKeyRevealDialogProps {
  createdKeyValue: string | null;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export const ApiKeyRevealDialog = ({ createdKeyValue, onClose, onCopy }: ApiKeyRevealDialogProps) => {
  return (
    <Dialog open={!!createdKeyValue} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-yellow-500" />
            Salve sua API Key
          </DialogTitle>
          <DialogDescription>
            Esta chave sera exibida apenas uma vez. Copie e guarde em local seguro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <code className="block bg-[hsl(var(--muted))] border border-[hsl(var(--border))] p-3 rounded text-sm font-mono break-all">
            {createdKeyValue}
          </code>
          <Button className="w-full" onClick={() => { if (createdKeyValue) onCopy(createdKeyValue); }}>
            <Copy className="h-4 w-4 mr-2" /> Copiar API Key
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
