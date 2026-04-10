import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface NewApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newKeyName: string;
  onNewKeyNameChange: (value: string) => void;
  onCreate: () => void;
  isPending: boolean;
}

export const NewApiKeyDialog = ({
  open,
  onOpenChange,
  newKeyName,
  onNewKeyNameChange,
  onCreate,
  isPending,
}: NewApiKeyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
          <Plus className="h-4 w-4 mr-2" />
          Nova API Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Nova API Key</DialogTitle>
          <DialogDescription>
            Crie uma nova chave de API para integração com agentes IA.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="keyName">Nome da API Key</Label>
            <Input
              id="keyName"
              value={newKeyName}
              onChange={(e) => onNewKeyNameChange(e.target.value)}
              placeholder="Ex: Agente WhatsApp, API Externa..."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreate} disabled={isPending} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
              {isPending ? 'Criando...' : 'Criar API Key'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
