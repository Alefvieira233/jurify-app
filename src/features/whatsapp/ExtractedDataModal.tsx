import { useEffect, useState } from 'react';
import { Wand2, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useExtractData, type ExtractedData } from '@/hooks/useWhatsAppAI';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  /** Callback quando user clica em "Aplicar". Recebe campos selecionados. */
  onApply?: (selectedFields: Partial<ExtractedData>) => void;
}

const FIELD_LABELS: Record<keyof ExtractedData, string> = {
  nome: 'Nome',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  rg: 'RG',
  telefone_alternativo: 'Telefone alternativo',
  email: 'Email',
  endereco: 'Endereço',
  cidade: 'Cidade',
  estado: 'Estado',
  cep: 'CEP',
  profissao: 'Profissão',
  estado_civil: 'Estado civil',
  processo_numero: 'Processo CNJ',
  area_juridica: 'Área jurídica',
  valor_causa: 'Valor da causa',
  urgencia: 'Urgência',
  observacoes: 'Observações',
};

const URGENCIA_COLOR: Record<string, string> = {
  baixa: 'bg-green-500/10 text-green-700 border-green-500/30',
  media: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  alta: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  critica: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
};

const ExtractedDataModal = ({ open, onOpenChange, conversationId, onApply }: Props) => {
  const extract = useExtractData();
  const [data, setData] = useState<ExtractedData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && !data) {
      void extract.mutateAsync(conversationId).then(result => {
        setData(result.extracted);
        // Pre-selects all populated fields
        setSelected(new Set(Object.keys(result.extracted)));
      }).catch(() => undefined);
    }
    if (!open) {
      setData(null);
      setSelected(new Set());
    }
  }, [open, conversationId, data, extract]);

  const toggle = (field: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const handleApply = () => {
    if (!data) return;
    const filtered: Partial<ExtractedData> = {};
    for (const key of selected) {
      const value = data[key as keyof ExtractedData];
      if (value !== undefined) {
        // @ts-expect-error — assignment by key inference
        filtered[key as keyof ExtractedData] = value;
      }
    }
    onApply?.(filtered);
    onOpenChange(false);
  };

  const fieldsAvailable = data ? Object.entries(data).filter(([, v]) => v !== undefined && v !== null && v !== '') : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Dados extraídos da conversa
          </DialogTitle>
          <DialogDescription>
            IA detectou os dados abaixo na conversa. Selecione os que quer aplicar ao lead.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {extract.isPending && !data ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Extraindo dados...
            </div>
          ) : !data || fieldsAvailable.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum dado estruturado detectado. Peça ao cliente nome, CPF, telefone, etc.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {fieldsAvailable.map(([key, value]) => {
                const isUrgencia = key === 'urgencia';
                const display = isUrgencia ? String(value) : (typeof value === 'number' ? value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : String(value));
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-colors ${selected.has(key) ? 'bg-primary/5 border-primary/30' : 'hover:bg-muted/30'}`}
                  >
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={() => toggle(key)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {FIELD_LABELS[key as keyof ExtractedData] ?? key}
                        </span>
                        {isUrgencia && (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${URGENCIA_COLOR[String(value)] ?? ''}`}>
                            {String(value).toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm break-words">{display}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {fieldsAvailable.length > 0 && (
            <Button onClick={handleApply} disabled={selected.size === 0} className="gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Aplicar ao lead ({selected.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExtractedDataModal;
