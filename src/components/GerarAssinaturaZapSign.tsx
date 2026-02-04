import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Send } from 'lucide-react';
import { useZapSignIntegration } from '@/hooks/useZapSignIntegration';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GerarAssinaturaZapSignProps {
  contrato: {
    id: string;
    nome_cliente: string;
    area_juridica: string;
    valor_causa: number;
    texto_contrato: string;
    lead_id?: string;
  };
  onSuccess?: () => void;
}

export const GerarAssinaturaZapSign = ({ contrato, onSuccess }: GerarAssinaturaZapSignProps) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const { isLoading, gerarLinkAssinatura } = useZapSignIntegration();

  const { data: lead } = useQuery({
    queryKey: ['lead', tenantId, contrato.lead_id],
    queryFn: async () => {
      if (!contrato.lead_id || !tenantId) return null;

      const { data, error } = await supabase
        .from('leads')
        .select('email, telefone')
        .eq('tenant_id', tenantId)
        .eq('id', contrato.lead_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!contrato.lead_id && !!tenantId
  });

  React.useEffect(() => {
    if (lead) {
      setEmail(lead.email || '');
      setTelefone(lead.telefone || '');
    }
  }, [lead]);

  const handleGerarLink = async () => {
    if (!email) {
      toast.error('E-mail e obrigatorio para gerar o link de assinatura');
      return;
    }

    const contractData = {
      nome_cliente: contrato.nome_cliente,
      email,
      telefone,
      area_juridica: contrato.area_juridica,
      valor_causa: contrato.valor_causa,
      texto_contrato: contrato.texto_contrato
    };

    const sucesso = await gerarLinkAssinatura(contrato.id, contractData);

    if (sucesso) {
      setIsOpen(false);
      if (onSuccess) onSuccess();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-500 hover:bg-blue-600">
          <FileText className="h-4 w-4 mr-2" />
          Gerar Assinatura Digital
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Link de Assinatura</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Cliente:</strong> {contrato.nome_cliente}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Area:</strong> {contrato.area_juridica}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail do Cliente *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone (Opcional)</Label>
              <Input
                id="telefone"
                type="tel"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleGerarLink()}
              disabled={isLoading || !email}
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Gerando...' : 'Gerar Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
