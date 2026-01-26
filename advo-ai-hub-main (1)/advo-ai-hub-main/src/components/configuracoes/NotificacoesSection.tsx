
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bell, Plus, Edit, Save } from 'lucide-react';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';

const NotificacoesSection = () => {
  const { templates, updateTemplate, createTemplate, isUpdating } = useNotificationTemplates();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    template: '',
    event_type: '',
    is_active: true,
    roles_enabled: [] as string[]
  });

  const roles_list = [
    { value: 'administrador', label: 'Administrador' },
    { value: 'advogado', label: 'Advogado' },
    { value: 'comercial', label: 'Comercial' },
    { value: 'pos_venda', label: 'Pós-venda' },
    { value: 'suporte', label: 'Suporte' }
  ];

  const event_types = [
    { value: 'lead_created', label: 'Novo Lead' },
    { value: 'contract_created', label: 'Novo Contrato' },
    { value: 'appointment_created', label: 'Novo Agendamento' },
    { value: 'contract_signed', label: 'Contrato Assinado' },
    { value: 'payment_received', label: 'Pagamento Recebido' }
  ];

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      title: template.title,
      template: template.template,
      event_type: template.event_type,
      is_active: template.is_active,
      roles_enabled: template.roles_enabled || []
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingTemplate) {
      updateTemplate({
        ...formData,
        id: editingTemplate.id
      });
    } else {
      createTemplate(formData);
    }
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      title: '',
      template: '',
      event_type: '',
      is_active: true,
      roles_enabled: []
    });
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles_enabled: prev.roles_enabled.includes(role)
        ? prev.roles_enabled.filter(r => r !== role)
        : [...prev.roles_enabled, role]
    }));
  };

  const getEventTypeLabel = (eventType: string) => {
    return event_types.find(e => e.value === eventType)?.label || eventType;
  };

  const getRoleLabel = (role: string) => {
    return roles_list.find(r => r.value === role)?.label || role;
  };

  return (
    <div className="space-y-6">
      {/* Templates de Notificação */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Templates de Notificação
              </CardTitle>
              <CardDescription>
                Configure os templates de notificação para diferentes eventos do sistema
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTemplate(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Editar Template' : 'Novo Template'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome do Template</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: novo_lead"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event_type">Tipo de Evento</Label>
                      <Input
                        id="event_type"
                        value={formData.event_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value }))}
                        placeholder="Ex: lead_created"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="title">Título da Notificação</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Novo Lead Cadastrado"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template">Template da Mensagem</Label>
                    <Textarea
                      id="template"
                      value={formData.template}
                      onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                      placeholder="Use {variavel} para inserir dados dinâmicos"
                      rows={4}
                    />
                    <div className="text-sm text-gray-500 mt-1">
                      Variáveis disponíveis: {'{nome_lead}'}, {'{responsavel}'}, {'{valor}'}, {'{data_hora}'}
                    </div>
                  </div>

                  <div>
                    <Label>Roles Habilitadas</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {roles_list.map(role => (
                        <div key={role.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={role.value}
                            checked={formData.roles_enabled.includes(role.value)}
                            onChange={() => toggleRole(role.value)}
                            className="rounded"
                          />
                          <Label htmlFor={role.value} className="text-sm">
                            {role.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label>Template ativo</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isUpdating}>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getEventTypeLabel(template.event_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>{template.title}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.roles_enabled?.map(role => (
                        <Badge key={role} variant="secondary" className="text-xs">
                          {getRoleLabel(role)}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={template.is_active ? 'default' : 'destructive'}>
                      {template.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificacoesSection;
