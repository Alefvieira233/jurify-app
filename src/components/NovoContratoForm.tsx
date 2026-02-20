import React, { useState } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Lead {
  id: string;
  nome: string;
  area_juridica: string;
  valor_causa?: number;
}

interface NovoContratoFormProps {
  onClose: () => void;
}

type ContratoInsert = {
  tenant_id: string;
  lead_id: string | null;
  nome_cliente: string;
  area_juridica: string;
  valor_causa: number;
  responsavel: string;
  texto_contrato: string;
  clausulas_customizadas: string | null;
  status: 'rascunho';
  created_at: string;
};

export const NovoContratoForm = ({ onClose }: NovoContratoFormProps) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [areaJuridica, setAreaJuridica] = useState('');
  const [valorCausa, setValorCausa] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [textoContrato, setTextoContrato] = useState(`CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS

CONTRATANTE: {nome_cliente}
ÁREA JURÍDICA: {area_juridica}
VALOR DA CAUSA: R$ {valor_causa}

PRESTADOR DE SERVIÇOS: {responsavel}

CLÁUSULA 1ª - DO OBJETO
O presente contrato tem por objeto a prestação de serviços advocatícios especializados em {area_juridica}, conforme descrito neste instrumento.

CLÁUSULA 2ª - DOS HONORÁRIOS
Pelos serviços objeto deste contrato, o CONTRATANTE pagará ao PRESTADOR DE SERVIÇOS o valor correspondente a 30% do valor da causa, ou seja, R$ {valor_honorarios}.

CLÁUSULA 3ª - DAS OBRIGAÇÕES
O PRESTADOR DE SERVIÇOS obriga-se a:
- Prestar os serviços com diligência e competência técnica;
- Manter o CONTRATANTE informado sobre o andamento do processo;
- Zelar pelos interesses do CONTRATANTE dentro dos limites legais e éticos.

CLÁUSULA 4ª - DO PRAZO
Este contrato terá vigência até a conclusão dos serviços contratados.

CLÁUSULA 5ª - DO FORO
Fica eleito o foro da comarca local para dirimir quaisquer controvérsias oriundas deste contrato.

Por estarem de acordo, as partes assinam o presente contrato em duas vias de igual teor.

Data: ___/___/______

_____________________          _____________________
   CONTRATANTE                    PRESTADOR DE SERVIÇOS`);
  const [clausulasCustomizadas, setClausulasCustomizadas] = useState('');

  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads-contratos', tenantId],
    queryFn: async () => {
      if (!tenantId) return [] as Lead[];
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, area_juridica, valor_causa')
        .eq('tenant_id', tenantId)
        .order('nome');

      if (error) throw error;
      return data as Lead[];
    }
  });

  const createContratoMutation = useMutation({
    mutationFn: async (contratoData: ContratoInsert) => {
      const { error } = await supabase
        .from('contratos')
        .insert([contratoData]);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato criado com sucesso!');
      onClose();
    },
    onError: () => {
      toast.error('Erro ao criar contrato');
    }
  });

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setNomeCliente(lead.nome);
      setAreaJuridica(lead.area_juridica);
      setValorCausa(lead.valor_causa?.toString() || '');
    }
  };

  const gerarTextoFinal = () => {
    const valorCausaNum = Number.parseFloat(valorCausa) || 0;
    const valorHonorarios = valorCausaNum * 0.3;

    return textoContrato
      .replace(/{nome_cliente}/g, nomeCliente)
      .replace(/{area_juridica}/g, areaJuridica)
      .replace(/{valor_causa}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorCausaNum))
      .replace(/{valor_honorarios}/g, new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorHonorarios))
      .replace(/{responsavel}/g, responsavel);
  };

  const validateInput = (value: string, type: 'text' | 'email' | 'number' | 'currency') => {
    const sanitized = value.trim().replace(/<script[^>]*>.*?<\/script>/gi, '').replace(/<[^>]*>/g, '');

    switch (type) {
      case 'text':
        return sanitized.length >= 2 && sanitized.length <= 200;
      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(sanitized);
      }
      case 'number': {
        const num = Number.parseFloat(sanitized);
        return Number.isFinite(num) && num >= 0 && num <= 999999999;
      }
      case 'currency': {
        const currency = Number.parseFloat(sanitized);
        return Number.isFinite(currency) && currency >= 0 && currency <= 999999999;
      }
      default:
        return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantId) {
      toast.error('Tenant não encontrado. Refaça o login.');
      return;
    }

    const validationErrors: string[] = [];

    if (!nomeCliente || !validateInput(nomeCliente, 'text')) {
      validationErrors.push('Nome do cliente deve ter entre 2 e 200 caracteres');
    }

    if (!areaJuridica || areaJuridica.length < 2) {
      validationErrors.push('Área jurídica é obrigatória');
    }

    if (!valorCausa || !validateInput(valorCausa, 'currency')) {
      validationErrors.push('Valor da causa deve ser um número válido');
    }

    if (!responsavel || responsavel.length < 2) {
      validationErrors.push('Responsável é obrigatório');
    }

    if (textoContrato.length < 50) {
      validationErrors.push('Texto do contrato deve ter pelo menos 50 caracteres');
    }

    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi
    ];

    const hasDangerousContent = dangerousPatterns.some(pattern =>
      pattern.test(textoContrato) || pattern.test(clausulasCustomizadas)
    );

    if (hasDangerousContent) {
      validationErrors.push('Conteúdo contém elementos não permitidos por segurança');
    }

    if (validationErrors.length > 0) {
      toast.error(`Erros de validação:\n${validationErrors.join('\n')}`);
      return;
    }

    const valorCausaParsed = Number.parseFloat(valorCausa);

    const contratoData: ContratoInsert = {
      tenant_id: tenantId,
      lead_id: selectedLeadId || null,
      nome_cliente: nomeCliente.trim().substring(0, 200),
      area_juridica: areaJuridica.trim(),
      valor_causa: Number.isFinite(valorCausaParsed) ? Math.max(0, Math.min(999999999, valorCausaParsed)) : 0,
      responsavel: responsavel.trim(),
      texto_contrato: textoContrato.trim().substring(0, 10000),
      clausulas_customizadas: clausulasCustomizadas?.trim().substring(0, 5000) || null,
      status: 'rascunho' as const,
      created_at: new Date().toISOString()
    };

    createContratoMutation.mutate(contratoData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Lead Existente (Opcional)</Label>
        <Select value={selectedLeadId} onValueChange={handleLeadSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um lead existente ou preencha manualmente" />
          </SelectTrigger>
          <SelectContent>
            {leads.map(lead => (
              <SelectItem key={lead.id} value={lead.id}>
                {lead.nome} - {lead.area_juridica}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nome do Cliente</Label>
          <Input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>Área Jurídica</Label>
          <Input value={areaJuridica} onChange={(e) => setAreaJuridica(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label>Valor da Causa (R$)</Label>
          <Input
            type="number"
            value={valorCausa}
            onChange={(e) => setValorCausa(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Responsável</Label>
          <Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Texto do Contrato</Label>
        <Textarea
          value={textoContrato}
          onChange={(e) => setTextoContrato(e.target.value)}
          rows={12}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Cláusulas Customizadas (Opcional)</Label>
        <Textarea
          value={clausulasCustomizadas}
          onChange={(e) => setClausulasCustomizadas(e.target.value)}
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-amber-500 hover:bg-amber-600">
          Salvar Contrato
        </Button>
        <Button type="button" variant="outline" onClick={() => setTextoContrato(gerarTextoFinal())}>
          Atualizar Texto
        </Button>
      </div>
    </form>
  );
};
