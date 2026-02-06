/**
 * 📝 LEAD PROCESSING TAB - Enterprise Dashboard Subcomponent
 * 
 * Formulário para processar novos leads.
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Mail, MessageCircle, Phone, RefreshCw, Zap } from 'lucide-react';
import { Priority } from '@/lib/multiagents/types';

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
  legal_area: string;
  urgency: Priority;
  source: 'whatsapp' | 'email' | 'chat' | 'form';
}

interface LeadProcessingTabProps {
  newLead: LeadFormData;
  setNewLead: React.Dispatch<React.SetStateAction<LeadFormData>>;
  isProcessing: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const LeadProcessingTab: React.FC<LeadProcessingTabProps> = ({
  newLead,
  setNewLead,
  isProcessing,
  onSubmit
}) => {
  return (
    <Card className="card-monolith">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Processar Lead Enterprise
        </CardTitle>
        <CardDescription>
          Envie um lead para processamento automático pelos agentes especializados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={newLead.name}
                onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                placeholder="João Silva"
                required
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                placeholder="joao@email.com"
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={newLead.phone}
                onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
                className="border-gray-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="legal_area">Área Jurídica</Label>
              <Select
                value={newLead.legal_area}
                onValueChange={(value) => setNewLead({ ...newLead, legal_area: value })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="familia">Família</SelectItem>
                  <SelectItem value="previdenciario">Previdenciário</SelectItem>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="empresarial">Empresarial</SelectItem>
                  <SelectItem value="tributario">Tributário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgency">Urgência</Label>
              <Select
                value={newLead.urgency}
                onValueChange={(value: string) => setNewLead({ ...newLead, urgency: value as Priority })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Canal de Origem</Label>
              <Select
                value={newLead.source}
                onValueChange={(value: string) => setNewLead({ ...newLead, source: value as typeof newLead.source })}
              >
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-600" />
                      WhatsApp
                    </div>
                  </SelectItem>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600" />
                      Email
                    </div>
                  </SelectItem>
                  <SelectItem value="chat">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-purple-600" />
                      Chat Online
                    </div>
                  </SelectItem>
                  <SelectItem value="form">Formulário Web</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Descrição do Caso *</Label>
            <Textarea
              id="message"
              value={newLead.message}
              onChange={(e) => setNewLead({ ...newLead, message: e.target.value })}
              placeholder="Descreva detalhadamente o problema jurídico ou necessidade do cliente..."
              rows={4}
              required
              className="border-gray-300"
            />
            <p className="text-xs text-gray-500">
              Mínimo 10 caracteres. Seja específico para melhor qualificação.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isProcessing || !newLead.name || !newLead.message}
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                Processando com IA...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                Processar com Multiagentes
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
