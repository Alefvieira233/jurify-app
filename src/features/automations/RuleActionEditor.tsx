import { Plus, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { STATUS_LEAD, LEAD_STATUS_LABELS } from '@/schemas/leadSchema';
import { PRIORIDADES } from '@/types/crm-operacional';
import type { ActionDraft } from './types';
import { ACTION_TYPE_OPTIONS } from './types';

interface RuleActionEditorProps {
  actions: ActionDraft[];
  onAdd: () => void;
  onRemove: (key: string) => void;
  onUpdateType: (key: string, tipo: string) => void;
  onUpdateConfig: (key: string, configKey: string, configValue: unknown) => void;
}

const RuleActionEditor = ({
  actions,
  onAdd,
  onRemove,
  onUpdateType,
  onUpdateConfig,
}: RuleActionEditorProps) => {

  const renderActionConfig = (action: ActionDraft) => {
    const cfg = action.config;
    const setConfig = (key: string, val: unknown) => onUpdateConfig(action._key, key, val);

    switch (action.tipo) {
      case 'enviar_whatsapp':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mensagem Template</Label>
              <Textarea
                placeholder="Olá {{nome}}, sua consulta está agendada para..."
                value={(cfg.template as string) ?? ''}
                onChange={(e) => setConfig('template', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[80px]"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID da Conexão</Label>
              <Input
                placeholder="UUID da conexão WhatsApp"
                value={(cfg.conexao_id as string) ?? ''}
                onChange={(e) => setConfig('conexao_id', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
          </div>
        );

      case 'enviar_email':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Assunto</Label>
              <Input
                placeholder="Assunto do e-mail..."
                value={(cfg.subject as string) ?? ''}
                onChange={(e) => setConfig('subject', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Corpo</Label>
              <Textarea
                placeholder="Corpo do e-mail..."
                value={(cfg.body as string) ?? ''}
                onChange={(e) => setConfig('body', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[80px]"
              />
            </div>
          </div>
        );

      case 'alterar_status':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Novo Status</Label>
            <Select
              value={(cfg.novo_status as string) ?? ''}
              onValueChange={(v) => setConfig('novo_status', v)}
            >
              <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                <SelectValue placeholder="Selecione o status..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_LEAD.map((s) => (
                  <SelectItem key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'alterar_prioridade':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nova Prioridade</Label>
            <Select
              value={(cfg.nova_prioridade as string) ?? ''}
              onValueChange={(v) => setConfig('nova_prioridade', v)}
            >
              <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                <SelectValue placeholder="Selecione a prioridade..." />
              </SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'atribuir_responsavel':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Membro</Label>
            <Input
              placeholder="UUID do membro da equipe"
              value={(cfg.responsavel_id as string) ?? ''}
              onChange={(e) => setConfig('responsavel_id', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'chamar_webhook':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">URL</Label>
              <Input
                placeholder="https://n8n.example.com/webhook/..."
                value={(cfg.url as string) ?? ''}
                onChange={(e) => setConfig('url', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Método</Label>
              <Select
                value={(cfg.method as string) ?? 'POST'}
                onValueChange={(v) => setConfig('method', v)}
              >
                <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Headers (JSON)</Label>
              <Textarea
                placeholder='{"Authorization": "Bearer ..."}'
                value={(cfg.headers as string) ?? ''}
                onChange={(e) => setConfig('headers', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[60px] font-mono text-xs"
              />
            </div>
          </div>
        );

      case 'executar_agente':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Agente</Label>
            <Input
              placeholder="UUID do agente IA"
              value={(cfg.agente_id as string) ?? ''}
              onChange={(e) => setConfig('agente_id', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'notificar_equipe':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mensagem</Label>
            <Textarea
              placeholder="Mensagem para a equipe..."
              value={(cfg.mensagem as string) ?? ''}
              onChange={(e) => setConfig('mensagem', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10 min-h-[80px]"
            />
          </div>
        );

      case 'adicionar_tag':
      case 'remover_tag':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">
              Nome da Tag
            </Label>
            <Input
              placeholder="Nome da tag..."
              value={(cfg.tag_nome as string) ?? ''}
              onChange={(e) => setConfig('tag_nome', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'mover_departamento':
        return (
          <div className="mt-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">
              ID do Departamento
            </Label>
            <Input
              placeholder="UUID do departamento"
              value={(cfg.departamento_id as string) ?? ''}
              onChange={(e) => setConfig('departamento_id', e.target.value)}
              className="mt-1 rounded-[10px] bg-background/80 border-border/10"
            />
          </div>
        );

      case 'criar_agendamento':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Título do Agendamento
              </Label>
              <Input
                placeholder="Título..."
                value={(cfg.titulo as string) ?? ''}
                onChange={(e) => setConfig('titulo', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                Data (relativa ou fixa)
              </Label>
              <Input
                placeholder="Ex: +3d (3 dias) ou 2026-04-01"
                value={(cfg.data as string) ?? ''}
                onChange={(e) => setConfig('data', e.target.value)}
                className="mt-1 rounded-[10px] bg-background/80 border-border/10"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-[10px] uppercase font-bold text-emerald-400 tracking-wider border border-emerald-500/20">
          Ações
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAdd}
          className="rounded-[10px] gap-1 text-xs hover:bg-muted/30"
        >
          <Plus className="w-3.5 h-3.5" />
          Adicionar Ação
        </Button>
      </div>

      {actions.length === 0 && (
        <div className="text-center py-6 rounded-[16px] border border-dashed border-border/10 bg-muted/20">
          <Zap className="w-6 h-6 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma ação definida</p>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-1">
            Adicione ações que serão executadas quando as condições forem atendidas
          </p>
        </div>
      )}

      {actions.map((action, idx) => (
        <div
          key={action._key}
          className="rounded-[16px] border border-border/10 bg-muted/20 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Ação {idx + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-[8px] hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onRemove(action._key)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div>
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Ação</Label>
            <Select
              value={action.tipo}
              onValueChange={(v) => onUpdateType(action._key, v)}
            >
              <SelectTrigger className="mt-1 rounded-[10px] bg-background/80 border-border/10">
                <SelectValue placeholder="Selecione a ação..." />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPE_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic config form */}
          {renderActionConfig(action)}
        </div>
      ))}
    </section>
  );
};

export default RuleActionEditor;
