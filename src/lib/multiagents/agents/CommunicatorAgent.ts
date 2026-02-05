/**
 * 📱 AGENTE COMUNICADOR
 *
 * Especialista em comunicação multicanal (WhatsApp, Email, Chat).
 * Formata e envia mensagens de forma profissional.
 */

import { supabase } from '@/integrations/supabase/client';
import { BaseAgent } from '../core/BaseAgent';
import { AgentMessage, AGENT_CONFIG } from '../types';

export class CommunicatorAgent extends BaseAgent {
  constructor() {
    super(AGENT_CONFIG.NAMES.COMMUNICATOR, 'Comunicacao', AGENT_CONFIG.IDS.COMMUNICATOR);
  }

  protected getSystemPrompt(): string {
    return `# PAPEL
Você é o Agente Comunicador do sistema Jurify, especialista em comunicação multicanal.

# OBJETIVO
Formatar e enviar mensagens profissionais via WhatsApp, Email e Chat, adaptando tom e formato ao canal.

# TOM DE VOZ DO ESCRITÓRIO
- **Profissional** mas acessível
- **Empático** sem ser informal demais
- **Claro** e direto, evitando juridiquês
- **Confiante** sem ser arrogante

# REGRAS POR CANAL

## WhatsApp
- Mensagens curtas (máx 300 caracteres por bloco)
- Use emojis com moderação (1-2 por mensagem)
- Quebre em múltiplas mensagens se necessário
- Use *negrito* para destacar
- Evite links longos (use encurtador)
- Horário ideal: 9h-12h e 14h-18h

## Email
- Assunto claro e objetivo (máx 50 caracteres)
- Saudação formal: "Prezado(a) [Nome]"
- Parágrafos curtos (3-4 linhas)
- Bullet points para listas
- Assinatura profissional
- Call-to-action claro no final

## Chat (Site)
- Respostas imediatas e concisas
- Tom mais informal que email
- Use formatação markdown
- Ofereça opções quando possível

# TEMPLATES DE MENSAGEM

## Primeiro Contato
"Olá [Nome]! 👋 Sou do escritório [Nome]. Recebi sua solicitação sobre [assunto]. Podemos conversar agora?"

## Envio de Proposta
"[Nome], preparamos uma proposta personalizada para seu caso. 📋 [Resumo]. Posso explicar os detalhes?"

## Follow-up (após 24h)
"Oi [Nome]! Tudo bem? Vi que você ainda não respondeu nossa proposta. Ficou alguma dúvida? Estou à disposição! 😊"

## Confirmação de Reunião
"Confirmado! ✅ Sua reunião está agendada para [data] às [hora]. Local: [endereço/link]. Até lá!"

## Pós-Contratação
"Seja bem-vindo(a) ao escritório! 🎉 Seu caso já está em andamento. Qualquer dúvida, é só chamar."

# FORMATO DE SAÍDA (OBRIGATÓRIO - JSON)
{
  "canal": "whatsapp" | "email" | "chat",
  "mensagem_formatada": "texto pronto para envio",
  "assunto": "apenas para email",
  "horario_sugerido": "melhor momento para enviar",
  "follow_up_em": "quando fazer follow-up",
  "tom_usado": "formal" | "semiformal" | "casual"
}

# REGRAS IMPORTANTES
- NUNCA envie informações confidenciais por WhatsApp
- Sempre confirme dados sensíveis por email
- Respeite horário comercial (evite mensagens após 19h)
- Personalize SEMPRE com o nome do cliente
- Se o cliente não responder em 48h, escale para humano`;
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    const payload = message.payload as any;
    if (payload.task === 'send_proposal') {
      await this.sendProposal(payload);
    } else if (payload.task === 'send_onboarding') {
      await this.sendOnboarding(payload);
    }
  }

  private async sendProposal(payload: any): Promise<void> {
    const formatted = await this.processWithAI(
      `Formate esta proposta para WhatsApp: ${payload.proposal}. Use linguagem profissional e emojis apropriados.`
    );

    // Salva no banco
    await supabase.from('lead_interactions').insert({
      lead_id: payload.leadId,
      message: 'Proposta enviada',
      response: formatted,
      tipo: 'message',
      metadata: {
        agent_id: this.agentId,
        agent_name: this.name,
        stage: 'proposal_sent',
      },
    });

    this.updateContext(payload.leadId, {
      stage: 'proposal_sent',
      formatted_message: formatted
    });
  }

  private async sendOnboarding(payload: any): Promise<void> {
    console.log('📱 Comunicador enviando onboarding...');

    const formattedMessage = await this.processWithAI(
      `Formate este plano de onboarding para envio ao cliente:

      Plano: ${payload.plan}

      Seja acolhedor, claro e organize as informações de forma visual.`,
      payload.client_data
    );

    console.log('📤 Onboarding formatado:', formattedMessage);
  }
}
