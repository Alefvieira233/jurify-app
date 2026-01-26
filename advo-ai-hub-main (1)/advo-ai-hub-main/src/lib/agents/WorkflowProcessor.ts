/**
 * 🚀 JURIFY WORKFLOW PROCESSOR - SPACEX GRADE
 * 
 * Sistema de processamento de workflows jurídicos automatizados
 * que orquestra ações baseadas no tipo de agente e contexto do lead.
 * 
 * @author SpaceX Dev Team
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { AgentType, LeadStatus } from './AgentEngine';

// 🔄 TIPOS DE WORKFLOW
export enum WorkflowType {
  LEAD_QUALIFICATION = 'lead_qualification',
  PROPOSAL_GENERATION = 'proposal_generation',
  CONTRACT_CREATION = 'contract_creation',
  FOLLOW_UP = 'follow_up',
  ONBOARDING = 'onboarding'
}

// 📋 AÇÃO DO WORKFLOW
export interface WorkflowAction {
  id: string;
  type: 'send_message' | 'create_task' | 'schedule_meeting' | 'generate_document' | 'update_status';
  parameters: Record<string, any>;
  delay_minutes?: number;
  conditions?: WorkflowCondition[];
}

// 🎯 CONDIÇÃO DO WORKFLOW
export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

// 📊 WORKFLOW TEMPLATE
export interface WorkflowTemplate {
  id: string;
  name: string;
  type: WorkflowType;
  agent_type: AgentType;
  area_juridica: string;
  trigger_conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  active: boolean;
}

// 🚀 PROCESSADOR DE WORKFLOWS
export class WorkflowProcessor {
  private workflows: Map<string, WorkflowTemplate> = new Map();
  private activeExecutions: Map<string, string[]> = new Map(); // lead_id -> workflow_ids

  constructor() {
    this.initializeWorkflows();
  }

  /**
   * 🔧 Inicializa workflows padrão
   */
  private async initializeWorkflows() {
    console.log('🔧 Inicializando WorkflowProcessor...');
    
    // Carrega workflows customizados do banco
    const { data: customWorkflows } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('active', true);

    // Adiciona workflows padrão
    this.addDefaultWorkflows();
    
    // Adiciona workflows customizados
    if (customWorkflows) {
      customWorkflows.forEach(workflow => {
        this.workflows.set(workflow.id, workflow);
      });
    }

    console.log(`✅ ${this.workflows.size} workflows carregados`);
  }

  /**
   * 🎯 Adiciona workflows padrão do sistema
   */
  private addDefaultWorkflows() {
    // WORKFLOW SDR - QUALIFICAÇÃO DE LEADS
    this.workflows.set('sdr_qualification_trabalhista', {
      id: 'sdr_qualification_trabalhista',
      name: 'Qualificação SDR - Direito Trabalhista',
      type: WorkflowType.LEAD_QUALIFICATION,
      agent_type: AgentType.SDR,
      area_juridica: 'Direito Trabalhista',
      trigger_conditions: [
        { field: 'status', operator: 'equals', value: 'novo_lead' },
        { field: 'area_juridica', operator: 'equals', value: 'Direito Trabalhista' }
      ],
      actions: [
        {
          id: 'welcome_message',
          type: 'send_message',
          parameters: {
            template: 'sdr_welcome_trabalhista',
            personalized: true
          }
        },
        {
          id: 'qualification_questions',
          type: 'send_message',
          parameters: {
            template: 'qualification_trabalhista',
            questions: [
              'Qual é sua situação trabalhista atual?',
              'Há quanto tempo trabalha na empresa?',
              'Já tentou resolver a questão internamente?',
              'Qual o valor aproximado envolvido?'
            ]
          },
          delay_minutes: 2
        },
        {
          id: 'schedule_follow_up',
          type: 'create_task',
          parameters: {
            title: 'Follow-up qualificação trabalhista',
            description: 'Verificar respostas e qualificar lead',
            due_hours: 24
          },
          delay_minutes: 5
        }
      ],
      active: true
    });

    // WORKFLOW CLOSER - PROPOSTA TRABALHISTA
    this.workflows.set('closer_proposal_trabalhista', {
      id: 'closer_proposal_trabalhista',
      name: 'Proposta Closer - Direito Trabalhista',
      type: WorkflowType.PROPOSAL_GENERATION,
      agent_type: AgentType.CLOSER,
      area_juridica: 'Direito Trabalhista',
      trigger_conditions: [
        { field: 'status', operator: 'equals', value: 'em_qualificacao' },
        { field: 'area_juridica', operator: 'equals', value: 'Direito Trabalhista' }
      ],
      actions: [
        {
          id: 'generate_proposal',
          type: 'generate_document',
          parameters: {
            template: 'proposta_trabalhista',
            include_pricing: true,
            include_timeline: true
          }
        },
        {
          id: 'send_proposal',
          type: 'send_message',
          parameters: {
            template: 'proposal_presentation',
            attach_document: true
          },
          delay_minutes: 10
        },
        {
          id: 'schedule_meeting',
          type: 'schedule_meeting',
          parameters: {
            title: 'Apresentação da Proposta - Direito Trabalhista',
            duration_minutes: 30,
            type: 'video_call'
          },
          delay_minutes: 15
        }
      ],
      active: true
    });

    // WORKFLOW CS - ONBOARDING
    this.workflows.set('cs_onboarding_general', {
      id: 'cs_onboarding_general',
      name: 'Onboarding Customer Success',
      type: WorkflowType.ONBOARDING,
      agent_type: AgentType.CS,
      area_juridica: 'Geral',
      trigger_conditions: [
        { field: 'status', operator: 'equals', value: 'contrato_assinado' }
      ],
      actions: [
        {
          id: 'welcome_client',
          type: 'send_message',
          parameters: {
            template: 'cs_welcome',
            include_next_steps: true
          }
        },
        {
          id: 'create_case',
          type: 'create_task',
          parameters: {
            title: 'Novo caso jurídico',
            description: 'Iniciar acompanhamento do caso',
            priority: 'high'
          },
          delay_minutes: 30
        },
        {
          id: 'schedule_kickoff',
          type: 'schedule_meeting',
          parameters: {
            title: 'Kickoff do Caso',
            duration_minutes: 60,
            type: 'video_call'
          },
          delay_minutes: 60
        }
      ],
      active: true
    });
  }

  /**
   * 🎯 Executa workflow para um lead
   */
  async executeWorkflow(
    leadId: string,
    agentType: AgentType,
    areaJuridica: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    console.log(`🎯 Executando workflow para lead ${leadId}, agente ${agentType}, área ${areaJuridica}`);

    try {
      // Encontra workflows aplicáveis
      const applicableWorkflows = this.findApplicableWorkflows(leadId, agentType, areaJuridica, context);

      for (const workflow of applicableWorkflows) {
        await this.executeWorkflowActions(leadId, workflow, context);
      }

    } catch (error) {
      console.error('❌ Erro ao executar workflow:', error);
      throw error;
    }
  }

  /**
   * 🔍 Encontra workflows aplicáveis
   */
  private findApplicableWorkflows(
    leadId: string,
    agentType: AgentType,
    areaJuridica: string,
    context: Record<string, any>
  ): WorkflowTemplate[] {
    return Array.from(this.workflows.values()).filter(workflow => {
      // Verifica tipo de agente
      if (workflow.agent_type !== agentType) return false;

      // Verifica área jurídica (ou geral)
      if (workflow.area_juridica !== areaJuridica && workflow.area_juridica !== 'Geral') return false;

      // Verifica condições de trigger
      return this.evaluateConditions(workflow.trigger_conditions, context);
    });
  }

  /**
   * ✅ Avalia condições do workflow
   */
  private evaluateConditions(conditions: WorkflowCondition[], context: Record<string, any>): boolean {
    return conditions.every(condition => {
      const value = context[condition.field];
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'contains':
          return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        default:
          return false;
      }
    });
  }

  /**
   * 🚀 Executa ações do workflow
   */
  private async executeWorkflowActions(
    leadId: string,
    workflow: WorkflowTemplate,
    context: Record<string, any>
  ): Promise<void> {
    console.log(`🚀 Executando workflow ${workflow.name} para lead ${leadId}`);

    // Registra execução
    const executionId = await this.logWorkflowExecution(leadId, workflow.id);

    for (const action of workflow.actions) {
      try {
        // Aplica delay se especificado
        if (action.delay_minutes && action.delay_minutes > 0) {
          console.log(`⏱️ Aguardando ${action.delay_minutes} minutos para ação ${action.id}`);
          // Em produção, usar queue/scheduler
          await this.delay(action.delay_minutes * 60 * 1000);
        }

        // Verifica condições da ação
        if (action.conditions && !this.evaluateConditions(action.conditions, context)) {
          console.log(`⏭️ Pulando ação ${action.id} - condições não atendidas`);
          continue;
        }

        // Executa ação
        await this.executeAction(leadId, action, context);

        // Registra sucesso
        await this.logActionExecution(executionId, action.id, 'success');

      } catch (error) {
        console.error(`❌ Erro na ação ${action.id}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        await this.logActionExecution(executionId, action.id, 'error', message);
      }
    }
  }

  /**
   * ⚡ Executa uma ação específica
   */
  private async executeAction(
    leadId: string,
    action: WorkflowAction,
    context: Record<string, any>
  ): Promise<void> {
    console.log(`⚡ Executando ação ${action.type}: ${action.id}`);

    switch (action.type) {
      case 'send_message':
        await this.executeSendMessage(leadId, action.parameters, context);
        break;

      case 'create_task':
        await this.executeCreateTask(leadId, action.parameters, context);
        break;

      case 'schedule_meeting':
        await this.executeScheduleMeeting(leadId, action.parameters, context);
        break;

      case 'generate_document':
        await this.executeGenerateDocument(leadId, action.parameters, context);
        break;

      case 'update_status':
        await this.executeUpdateStatus(leadId, action.parameters, context);
        break;

      default:
        console.warn(`⚠️ Tipo de ação desconhecido: ${action.type}`);
    }
  }

  /**
   * 💬 Executa envio de mensagem
   */
  private async executeSendMessage(
    leadId: string,
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<void> {
    const message = await this.generateMessageFromTemplate(
      parameters.template,
      { ...context, leadId }
    );

    // Envia via WhatsApp/Email (implementar integração)
    console.log(`📤 Enviando mensagem para lead ${leadId}: ${message.substring(0, 100)}...`);

    // Salva no banco
    await supabase
      .from('lead_interactions')
      .insert({
        lead_id: leadId,
        message: 'Sistema: ' + message,
        response: '',
        tipo: 'message',
        metadata: {
          agent_id: context.agentId || 'system',
          source: 'workflow',
        },
        created_at: new Date().toISOString()
      });
  }

  /**
   * 📋 Executa criação de tarefa
   */
  private async executeCreateTask(
    leadId: string,
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<void> {
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (parameters.due_hours || 24));

    await supabase
      .from('tasks')
      .insert({
        lead_id: leadId,
        title: parameters.title,
        description: parameters.description,
        priority: parameters.priority || 'medium',
        due_date: dueDate.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString()
      });

    console.log(`📋 Tarefa criada: ${parameters.title}`);
  }

  /**
   * 📅 Executa agendamento de reunião
   */
  private async executeScheduleMeeting(
    leadId: string,
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<void> {
    // Integração com Google Calendar (implementar)
    const meetingData = {
      lead_id: leadId,
      title: parameters.title,
      duration_minutes: parameters.duration_minutes || 30,
      type: parameters.type || 'video_call',
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    await supabase
      .from('agendamentos')
      .insert(meetingData);

    console.log(`📅 Reunião agendada: ${parameters.title}`);
  }

  /**
   * 📄 Executa geração de documento
   */
  private async executeGenerateDocument(
    leadId: string,
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<void> {
    // Gera documento usando template (implementar)
    const document = await this.generateDocumentFromTemplate(
      parameters.template,
      { ...context, leadId }
    );

    await supabase
      .from('documents')
      .insert({
        lead_id: leadId,
        type: parameters.template,
        title: `Documento - ${parameters.template}`,
        content: document,
        status: 'generated',
        created_at: new Date().toISOString()
      });

    console.log(`📄 Documento gerado: ${parameters.template}`);
  }

  /**
   * 🔄 Executa atualização de status
   */
  private async executeUpdateStatus(
    leadId: string,
    parameters: Record<string, any>,
    context: Record<string, any>
  ): Promise<void> {
    await supabase
      .from('leads')
      .update({ status: parameters.new_status })
      .eq('id', leadId);

    console.log(`🔄 Status atualizado para: ${parameters.new_status}`);
  }

  // 🛠️ MÉTODOS AUXILIARES

  private async generateMessageFromTemplate(
    template: string,
    context: Record<string, any>
  ): Promise<string> {
    // Templates de mensagem (implementar sistema mais robusto)
    const templates = {
      sdr_welcome_trabalhista: `Olá! Sou especialista em Direito Trabalhista. Vi que você tem uma questão trabalhista. Como posso ajudá-lo?`,
      qualification_trabalhista: `Para te ajudar melhor, preciso entender sua situação. Pode me contar mais detalhes sobre o problema trabalhista?`,
      proposal_presentation: `Preparei uma proposta personalizada para seu caso. Vou enviar os detalhes e podemos agendar uma conversa para esclarecer dúvidas.`,
      cs_welcome: `Parabéns! Seu contrato foi assinado. Agora vamos iniciar o acompanhamento do seu caso. Em breve entrarei em contato com os próximos passos.`
    };

    return templates[template] || `Mensagem automática do sistema.`;
  }

  private async generateDocumentFromTemplate(
    template: string,
    context: Record<string, any>
  ): Promise<string> {
    // Geração de documentos (implementar com templates mais robustos)
    return `Documento gerado automaticamente usando template: ${template}`;
  }

  private async logWorkflowExecution(leadId: string, workflowId: string): Promise<string> {
    const { data, error } = await supabase
      .from('workflow_executions')
      .insert({
        lead_id: leadId,
        workflow_id: workflowId,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  private async logActionExecution(
    executionId: string,
    actionId: string,
    status: 'success' | 'error',
    errorMessage?: string
  ): Promise<void> {
    await supabase
      .from('workflow_action_logs')
      .insert({
        execution_id: executionId,
        action_id: actionId,
        status,
        error_message: errorMessage,
        executed_at: new Date().toISOString()
      });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 🚀 INSTÂNCIA GLOBAL DO PROCESSADOR
export const workflowProcessor = new WorkflowProcessor();
