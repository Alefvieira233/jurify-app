import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useRBAC } from '@/hooks/useRBAC';

interface Props {
  processoId: string;
  processoNumero: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const RESULTADOS = [
  { value: 'encerrado_vitoria', label: 'Vitória' },
  { value: 'encerrado_derrota', label: 'Derrota' },
  { value: 'encerrado_acordo', label: 'Acordo' },
  { value: 'arquivado', label: 'Arquivar' },
] as const;

export function EncerrarProcessoDialog({ processoId, processoNumero, open, onClose, onSuccess }: Props) {
  const [resultado, setResultado] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { can } = useRBAC();

  const handleConfirm = async () => {
    if (!resultado || !can('processos', 'update')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('processos')
        .update({ status: resultado, data_encerramento: new Date().toISOString().split('T')[0] })
        .eq('id', processoId);
      if (error) throw error;
      toast({ title: 'Processo encerrado', description: `Processo ${processoNumero} encerrado com sucesso.` });
      void queryClient.invalidateQueries({ queryKey: ['processos'] });
      onSuccess();
      onClose();
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível encerrar o processo.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar Processo {processoNumero}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o resultado" />
            </SelectTrigger>
            <SelectContent>
              {RESULTADOS.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { void handleConfirm(); }} disabled={!resultado || loading}>
            {loading ? 'Encerrando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
