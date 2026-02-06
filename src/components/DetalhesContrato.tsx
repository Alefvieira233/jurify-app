
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Download, Send, Edit, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { StatusAssinatura } from './StatusAssinatura';
import { GerarAssinaturaZapSign } from './GerarAssinaturaZapSign';

interface Contrato {
  id: string;
  nome_cliente: string;
  area_juridica: string;
  valor_causa: number;
  status: string;
  responsavel: string;
  created_at: string;
  data_envio?: string;
  data_assinatura?: string;
  texto_contrato?: string;
  clausulas_customizadas?: string;
  observacoes?: string;
  lead_id?: string;
  status_assinatura?: string;
  link_assinatura_zapsign?: string;
  zapsign_document_id?: string;
  data_geracao_link?: string;
  data_envio_whatsapp?: string;
  telefone?: string;
}

interface DetalhesContratoProps {
  contrato: Contrato;
  onClose: () => void;
}

type ContratoUpdate = Partial<Pick<Contrato, 'status' | 'observacoes' | 'data_envio' | 'data_assinatura'>>;

export const DetalhesContrato = ({ contrato, onClose: _onClose }: DetalhesContratoProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState(contrato.status);
  const [editedObservacoes, setEditedObservacoes] = useState(contrato.observacoes || '');

  const queryClient = useQueryClient();

  // Mutation para atualizar contrato
  const updateContratoMutation = useMutation({
    mutationFn: async (updates: ContratoUpdate) => {
      const { error } = await supabase
        .from('contratos')
        .update(updates)
        .eq('id', contrato.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['contratos'] });
      toast.success('Contrato atualizado com sucesso!');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Erro ao atualizar contrato');
    }
  });

  const handleSave = () => {
    const updates: ContratoUpdate = {
      status: editedStatus,
      observacoes: editedObservacoes
    };

    // Adicionar timestamps baseado no status
    if (editedStatus === 'enviado' && contrato.status !== 'enviado') {
      updates.data_envio = new Date().toISOString();
    }
    if (editedStatus === 'assinado' && contrato.status !== 'assinado') {
      updates.data_assinatura = new Date().toISOString();
    }

    updateContratoMutation.mutate(updates);
  };

  const handleEnviarAssinatura = () => {
    updateContratoMutation.mutate({
      status: 'enviado',
      data_envio: new Date().toISOString()
    });
  };

  const handleGerarPDF = () => {
    toast.info('Funcionalidade de PDF será implementada em breve');
  };

  const handleZapSignSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ['contratos'] });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      rascunho: { label: 'Rascunho', className: 'bg-slate-500/15 text-slate-200 border border-slate-400/30' },
      enviado: { label: 'Enviado', className: 'bg-blue-500/15 text-blue-200 border border-blue-400/30' },
      assinado: { label: 'Assinado', className: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.rascunho;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">{contrato.nome_cliente}</h3>
          <p className="text-[hsl(var(--muted-foreground))]">{contrato.area_juridica}</p>
        </div>
        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handleGerarPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              {contrato.status === 'rascunho' && (
                <Button variant="outline" size="sm" onClick={handleEnviarAssinatura}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateContratoMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Informações básicas */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-[hsl(var(--muted))] rounded-lg">
        <div>
          <Label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Valor da Causa</Label>
          <p className="text-lg font-semibold">{formatCurrency(contrato.valor_causa)}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Status</Label>
          {isEditing ? (
            <Select value={editedStatus} onValueChange={setEditedStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="mt-1">{getStatusBadge(contrato.status)}</div>
          )}
        </div>
        <div>
          <Label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Responsável</Label>
          <p>{contrato.responsavel}</p>
        </div>
        <div>
          <Label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Data de Criação</Label>
          <p>{formatDate(contrato.created_at)}</p>
        </div>
        {contrato.data_envio && (
          <div>
            <Label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Data de Envio</Label>
            <p>{formatDate(contrato.data_envio)}</p>
          </div>
        )}
        {contrato.data_assinatura && (
          <div>
            <Label className="text-sm font-medium text-[hsl(var(--muted-foreground))]">Data de Assinatura</Label>
            <p>{formatDate(contrato.data_assinatura)}</p>
          </div>
        )}
      </div>

      {/* Assinatura Digital ZapSign */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">Assinatura Digital</h4>
          {!contrato.link_assinatura_zapsign && (
            <GerarAssinaturaZapSign 
              contrato={contrato} 
              onSuccess={handleZapSignSuccess}
            />
          )}
        </div>
        
        <StatusAssinatura 
          contrato={contrato}
          onStatusUpdate={handleZapSignSuccess}
        />
      </div>

      {/* Texto do contrato */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Texto do Contrato</Label>
        <div className="border rounded-lg p-4 bg-[hsl(var(--card))] max-h-60 overflow-y-auto">
          <pre className="text-sm whitespace-pre-wrap">{contrato.texto_contrato}</pre>
        </div>
      </div>

      {/* Cláusulas customizadas */}
      {contrato.clausulas_customizadas && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Cláusulas Customizadas</Label>
          <div className="border rounded-lg p-4 bg-[hsl(var(--muted))]">
            <pre className="text-sm whitespace-pre-wrap">{contrato.clausulas_customizadas}</pre>
          </div>
        </div>
      )}

      {/* Observações */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Observações</Label>
        {isEditing ? (
          <Textarea
            value={editedObservacoes}
            onChange={(e) => setEditedObservacoes(e.target.value)}
            rows={4}
            placeholder="Adicione observações sobre o contrato..."
          />
        ) : (
          <div className="border rounded-lg p-4 bg-[hsl(var(--muted))] min-h-16">
            <p className="text-sm">{contrato.observacoes || 'Nenhuma observação adicionada'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

