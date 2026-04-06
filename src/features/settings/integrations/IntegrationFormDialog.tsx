import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type CreateIntegracaoData } from '@/hooks/useIntegracoesConfig';

interface IntegrationFormDialogProps {
  isEdit: boolean;
  formData: CreateIntegracaoData;
  onFormDataChange: (data: CreateIntegracaoData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

const IntegrationFormDialog: React.FC<IntegrationFormDialogProps> = ({
  isEdit,
  formData,
  onFormDataChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <DialogContent className="sm:max-w-[550px]">
      <form onSubmit={(event) => { void onSubmit(event); }}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Integração' : 'Nova Integração'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize as configurações da integração.' : 'Configure uma nova integração externa.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-nome' : 'nome'} className="text-right text-sm">Nome</Label>
            <Input
              id={isEdit ? 'edit-nome' : 'nome'}
              value={formData.nome_integracao}
              onChange={(e) => onFormDataChange({ ...formData, nome_integracao: e.target.value })}
              className="col-span-3"
              placeholder="Ex: CRM, ERP, API de pagamento"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'ativa' | 'inativa' | 'erro') => onFormDataChange({ ...formData, status: value })}
            >
              <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="inativa">Inativa</SelectItem>
                <SelectItem value="erro">Erro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-endpoint' : 'endpoint'} className="text-right text-sm">Endpoint</Label>
            <Input
              id={isEdit ? 'edit-endpoint' : 'endpoint'}
              value={formData.endpoint_url}
              onChange={(e) => onFormDataChange({ ...formData, endpoint_url: e.target.value })}
              className="col-span-3"
              placeholder="https://api.exemplo.com/v1"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={isEdit ? 'edit-apikey' : 'apikey'} className="text-right text-sm">API Key</Label>
            <Input
              id={isEdit ? 'edit-apikey' : 'apikey'}
              type="password"
              value={formData.api_key_encrypted}
              onChange={(e) => onFormDataChange({ ...formData, api_key_encrypted: e.target.value })}
              className="col-span-3"
              placeholder="Sua API Key"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor={isEdit ? 'edit-obs' : 'obs'} className="text-right text-sm mt-2">Notas</Label>
            <Textarea
              id={isEdit ? 'edit-obs' : 'obs'}
              value={formData.observacoes ?? ''}
              onChange={(e) => onFormDataChange({ ...formData, observacoes: e.target.value })}
              className="col-span-3"
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="submit">{isEdit ? 'Atualizar' : 'Criar'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default IntegrationFormDialog;
