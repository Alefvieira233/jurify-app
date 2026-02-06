/**
 * 📋 WORKFLOW QUEUE - Async Job Processing
 *
 * Sistema de fila de trabalhos assíncronos com retry automático,
 * dead letter queue, controle de concorrência e prioridade.
 *
 * Inspirado em Inngest/BullMQ, implementado sobre Supabase.
 *
 * @version 1.0.0
 * @architecture Enterprise Grade
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('WorkflowQueue');

// 🎯 TIPOS
export type JobType =
  | 'process_lead'
  | 'send_whatsapp'
  | 'generate_document'
  | 'ingest_document'
  | 'send_email'
  | 'agent_followup'
  | 'cleanup_memory';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';

export interface JobPayload {
  [key: string]: unknown;
}

export interface CreateJobOptions {
  tenantId: string;
  jobType: JobType;
  payload: JobPayload;
  priority?: number; // 1-10, default 5
  maxAttempts?: number; // default 3
  idempotencyKey?: string;
}

export interface JobRecord {
  id: string;
  tenant_id: string;
  job_type: JobType;
  status: JobStatus;
  priority: number;
  payload: JobPayload;
  result: JobPayload | null;
  error_message: string | null;
  attempt: number;
  max_attempts: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dead_letter: number;
}

// 📋 CLASSE PRINCIPAL
export class WorkflowQueueService {
  private static instance: WorkflowQueueService;

  private constructor() {
    log.info('WorkflowQueue service initialized');
  }

  static getInstance(): WorkflowQueueService {
    if (!WorkflowQueueService.instance) {
      WorkflowQueueService.instance = new WorkflowQueueService();
    }
    return WorkflowQueueService.instance;
  }

  /**
   * 📥 Enfileira um novo job
   */
  async enqueue(options: CreateJobOptions): Promise<string | null> {
    try {
      // Verifica idempotência
      if (options.idempotencyKey) {
        const { data: existing } = await supabase
          .from('workflow_jobs')
          .select('id, status')
          .eq('idempotency_key', options.idempotencyKey)
          .maybeSingle();

        if (existing) {
          log.info('Job already exists (idempotent)', { id: existing.id, status: existing.status });
          return existing.id;
        }
      }

      const { data, error } = await supabase
        .from('workflow_jobs')
        .insert({
          tenant_id: options.tenantId,
          job_type: options.jobType,
          payload: options.payload,
          priority: Math.max(1, Math.min(10, options.priority ?? 5)),
          max_attempts: options.maxAttempts ?? 3,
          idempotency_key: options.idempotencyKey || null,
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) {
        log.error('Failed to enqueue job', error);
        return null;
      }

      log.info('Job enqueued', { id: data?.id, type: options.jobType, priority: options.priority });
      return data?.id ?? null;
    } catch (error) {
      log.error('enqueue exception', error);
      return null;
    }
  }

  /**
   * 📥 Enfileira um job de processamento de lead
   */
  async enqueueLeadProcessing(
    tenantId: string,
    leadId: string,
    message: string,
    channel: string = 'whatsapp',
    priority: number = 7
  ): Promise<string | null> {
    return this.enqueue({
      tenantId,
      jobType: 'process_lead',
      payload: { leadId, message, channel },
      priority,
      idempotencyKey: `lead_${leadId}_${Date.now()}`,
    });
  }

  /**
   * 📥 Enfileira envio de WhatsApp
   */
  async enqueueWhatsAppMessage(
    tenantId: string,
    to: string,
    text: string,
    leadId?: string,
    conversationId?: string
  ): Promise<string | null> {
    return this.enqueue({
      tenantId,
      jobType: 'send_whatsapp',
      payload: { to, text, leadId, conversationId },
      priority: 8,
    });
  }

  /**
   * 📥 Enfileira geração de documento
   */
  async enqueueDocumentGeneration(
    tenantId: string,
    templateId: string,
    data: Record<string, unknown>
  ): Promise<string | null> {
    return this.enqueue({
      tenantId,
      jobType: 'generate_document',
      payload: { templateId, ...data },
      priority: 5,
    });
  }

  /**
   * 📊 Obtém status de um job
   */
  async getJobStatus(jobId: string): Promise<JobRecord | null> {
    try {
      const { data, error } = await supabase
        .from('workflow_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        log.error('Failed to get job status', error);
        return null;
      }

      return data as JobRecord;
    } catch (error) {
      log.error('getJobStatus exception', error);
      return null;
    }
  }

  /**
   * ⏳ Aguarda conclusão de um job (polling)
   */
  async waitForCompletion(jobId: string, timeoutMs: number = 60000, pollIntervalMs: number = 2000): Promise<JobRecord | null> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const job = await this.getJobStatus(jobId);
      if (!job) return null;

      if (job.status === 'completed' || job.status === 'dead_letter') {
        return job;
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    log.warn('waitForCompletion timeout', { jobId, timeoutMs });
    return null;
  }

  /**
   * 📊 Estatísticas da fila por tenant
   */
  async getStats(tenantId: string): Promise<QueueStats> {
    try {
      const statuses: JobStatus[] = ['pending', 'processing', 'completed', 'failed', 'dead_letter'];
      const results: QueueStats = { pending: 0, processing: 0, completed: 0, failed: 0, dead_letter: 0 };

      const promises = statuses.map(async (status) => {
        const { count } = await supabase
          .from('workflow_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', status);
        return { status, count: count ?? 0 };
      });

      const counts = await Promise.all(promises);
      for (const { status, count } of counts) {
        results[status] = count;
      }

      return results;
    } catch (error) {
      log.error('getStats exception', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0, dead_letter: 0 };
    }
  }

  /**
   * 📋 Lista jobs recentes
   */
  async listJobs(
    tenantId: string,
    options?: { status?: JobStatus; jobType?: JobType; limit?: number }
  ): Promise<JobRecord[]> {
    try {
      let query = supabase
        .from('workflow_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (options?.status) {
        query = query.eq('status', options.status);
      }
      if (options?.jobType) {
        query = query.eq('job_type', options.jobType);
      }

      const { data, error } = await query;

      if (error) {
        log.error('listJobs failed', error);
        return [];
      }

      return (data || []) as JobRecord[];
    } catch (error) {
      log.error('listJobs exception', error);
      return [];
    }
  }

  /**
   * 🔄 Retry manual de um job falho
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workflow_jobs')
        .update({
          status: 'pending',
          error_message: null,
          next_retry_at: null,
          locked_by: null,
          locked_at: null,
        })
        .eq('id', jobId)
        .in('status', ['failed', 'dead_letter']);

      if (error) {
        log.error('retryJob failed', error);
        return false;
      }

      log.info('Job retried', { jobId });
      return true;
    } catch (error) {
      log.error('retryJob exception', error);
      return false;
    }
  }

  /**
   * 🗑️ Cancela um job pendente
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('workflow_jobs')
        .delete()
        .eq('id', jobId)
        .eq('status', 'pending');

      if (error) {
        log.error('cancelJob failed', error);
        return false;
      }

      log.info('Job cancelled', { jobId });
      return true;
    } catch (error) {
      log.error('cancelJob exception', error);
      return false;
    }
  }
}

// 🚀 Instância singleton
export const workflowQueue = WorkflowQueueService.getInstance();
