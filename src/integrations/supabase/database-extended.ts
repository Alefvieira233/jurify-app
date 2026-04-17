/**
 * Extended Database type that adds tables/columns not yet captured
 * by the auto-generated types.ts.
 *
 * These tables/columns exist in the Supabase database but were not included
 * in the last `supabase gen types` run. Once types are regenerated and these
 * entries appear in types.ts, the corresponding block below can be removed.
 *
 * When regenerating types locally:
 *   supabase gen types typescript --project-id yfxgncbopvnsltjqetxw > src/integrations/supabase/types.ts
 *
 * Migrations pending capture (Onda 2, 2026-04-16..17):
 *   - processo_andamentos (existing)
 *   - slash_commands
 *   - team_invites
 *   - documento_folders
 *   - email_failures
 *   - ai_usage.tokens_in/tokens_out/tokens_total
 *   - tenants.cnpj/endereco/telefone_principal/onboarding_completed_at
 *   - profiles.onboarding_step
 *   - processos.last_sync_at/sync_provider/sync_error
 *   - contratos.signed_file_url (+ status_assinatura novo valor 'recusado')
 *   - whatsapp_conversations.handoff_until
 */

import type { Database as GeneratedDatabase, Json } from './types';

/**
 * Additional tables not in the generated types.
 * Defined with minimal row/insert/update shapes based on actual usage.
 */
interface AdditionalTables {
  contratos_uploads: {
    Row: {
      id: string;
      tenant_id: string;
      nome_arquivo: string;
      caminho_storage: string;
      url_publica: string;
      tamanho_bytes: number;
      tipo_mime: string;
      hash_seguranca: string;
      metadados: Json | null;
      usuario_upload: string;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      nome_arquivo: string;
      caminho_storage: string;
      url_publica: string;
      tamanho_bytes: number;
      tipo_mime: string;
      hash_seguranca: string;
      metadados?: Json | null;
      usuario_upload: string;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      nome_arquivo?: string;
      caminho_storage?: string;
      url_publica?: string;
      tamanho_bytes?: number;
      tipo_mime?: string;
      hash_seguranca?: string;
      metadados?: Json | null;
      usuario_upload?: string;
      created_at?: string | null;
    };
    Relationships: [];
  };
  timeline_conversas: {
    Row: {
      id: string;
      tenant_id: string;
      lead_id: string | null;
      lead_nome: string | null;
      tipo: string | null;
      conteudo: string | null;
      remetente: string | null;
      timestamp: string | null;
      agente_ia_id: string | null;
      agente_ia_nome: string | null;
      usuario_nome: string | null;
      status: string | null;
      metadata: Json | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      lead_id?: string | null;
      lead_nome?: string | null;
      tipo?: string | null;
      conteudo?: string | null;
      remetente?: string | null;
      timestamp?: string | null;
      agente_ia_id?: string | null;
      agente_ia_nome?: string | null;
      usuario_nome?: string | null;
      status?: string | null;
      metadata?: Json | null;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      lead_id?: string | null;
      lead_nome?: string | null;
      tipo?: string | null;
      conteudo?: string | null;
      remetente?: string | null;
      timestamp?: string | null;
      agente_ia_id?: string | null;
      agente_ia_nome?: string | null;
      usuario_nome?: string | null;
      status?: string | null;
      metadata?: Json | null;
      created_at?: string | null;
    };
    Relationships: [];
  };
  n8n_workflows: {
    Row: {
      id: string;
      tenant_id: string;
      nome: string | null;
      ativo: boolean | null;
      url: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      nome?: string | null;
      ativo?: boolean | null;
      url?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      nome?: string | null;
      ativo?: boolean | null;
      url?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [];
  };
  ai_usage: {
    Row: {
      id: string;
      tenant_id: string;
      usage_date: string;
      tokens_used: number;
      tokens_in: number | null;
      tokens_out: number | null;
      tokens_total: number | null;
      budget_limit: number;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id?: string;
      usage_date: string;
      tokens_used?: number;
      tokens_in?: number | null;
      tokens_out?: number | null;
      tokens_total?: number | null;
      budget_limit?: number;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      usage_date?: string;
      tokens_used?: number;
      tokens_in?: number | null;
      tokens_out?: number | null;
      tokens_total?: number | null;
      budget_limit?: number;
      created_at?: string | null;
    };
    Relationships: [];
  };
  slash_commands: {
    Row: {
      id: string;
      tenant_id: string | null;
      command: string;
      agent_type: string;
      intent: string;
      description: string;
      active: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      tenant_id?: string | null;
      command: string;
      agent_type: string;
      intent: string;
      description: string;
      active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string | null;
      command?: string;
      agent_type?: string;
      intent?: string;
      description?: string;
      active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  processo_andamentos: {
    Row: {
      id: string;
      tenant_id: string;
      processo_id: string;
      data_andamento: string;
      tipo: string | null;
      descricao: string;
      orgao: string | null;
      raw: Json | null;
      external_id: string | null;
      provider: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      processo_id: string;
      data_andamento: string;
      tipo?: string | null;
      descricao: string;
      orgao?: string | null;
      raw?: Json | null;
      external_id?: string | null;
      provider?: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      processo_id?: string;
      data_andamento?: string;
      tipo?: string | null;
      descricao?: string;
      orgao?: string | null;
      raw?: Json | null;
      external_id?: string | null;
      provider?: string;
      created_at?: string;
    };
    Relationships: [];
  };
  team_invites: {
    Row: {
      id: string;
      tenant_id: string;
      email: string;
      role: string;
      token: string;
      invited_by: string | null;
      expires_at: string;
      accepted_at: string | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      email: string;
      role: string;
      token?: string;
      invited_by?: string | null;
      expires_at: string;
      accepted_at?: string | null;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      email?: string;
      role?: string;
      token?: string;
      invited_by?: string | null;
      expires_at?: string;
      accepted_at?: string | null;
      created_at?: string | null;
    };
    Relationships: [];
  };
  documento_folders: {
    Row: {
      id: string;
      tenant_id: string;
      nome: string;
      parent_id: string | null;
      created_by: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id: string;
      nome: string;
      parent_id?: string | null;
      created_by?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      nome?: string;
      parent_id?: string | null;
      created_by?: string | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    Relationships: [];
  };
  email_failures: {
    Row: {
      id: string;
      tenant_id: string | null;
      to_email: string;
      subject: string | null;
      template: string | null;
      error_message: string;
      provider: string | null;
      attempt_count: number | null;
      payload: Json | null;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id?: string | null;
      to_email: string;
      subject?: string | null;
      template?: string | null;
      error_message: string;
      provider?: string | null;
      attempt_count?: number | null;
      payload?: Json | null;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string | null;
      to_email?: string;
      subject?: string | null;
      template?: string | null;
      error_message?: string;
      provider?: string | null;
      attempt_count?: number | null;
      payload?: Json | null;
      created_at?: string | null;
    };
    Relationships: [];
  };
}

/**
 * Column additions not yet in generated types for tables that already exist.
 * These are merged into the existing table's Row/Insert/Update via intersection.
 */
interface ColumnAdditions {
  tenants: {
    Row: {
      cnpj: string | null;
      endereco: string | null;
      telefone_principal: string | null;
      onboarding_completed_at: string | null;
    };
    Insert: {
      cnpj?: string | null;
      endereco?: string | null;
      telefone_principal?: string | null;
      onboarding_completed_at?: string | null;
    };
    Update: {
      cnpj?: string | null;
      endereco?: string | null;
      telefone_principal?: string | null;
      onboarding_completed_at?: string | null;
    };
  };
  profiles: {
    Row: {
      onboarding_step: string | null;
    };
    Insert: {
      onboarding_step?: string | null;
    };
    Update: {
      onboarding_step?: string | null;
    };
  };
  processos: {
    Row: {
      last_sync_at: string | null;
      sync_provider: string | null;
      sync_error: string | null;
    };
    Insert: {
      last_sync_at?: string | null;
      sync_provider?: string | null;
      sync_error?: string | null;
    };
    Update: {
      last_sync_at?: string | null;
      sync_provider?: string | null;
      sync_error?: string | null;
    };
  };
  contratos: {
    Row: {
      signed_file_url: string | null;
      // status_assinatura passa a aceitar 'recusado' além dos valores anteriores — mantido como string | null
    };
    Insert: {
      signed_file_url?: string | null;
    };
    Update: {
      signed_file_url?: string | null;
    };
  };
  whatsapp_conversations: {
    Row: {
      handoff_until: string | null;
    };
    Insert: {
      handoff_until?: string | null;
    };
    Update: {
      handoff_until?: string | null;
    };
  };
}

type GenTables = GeneratedDatabase['public']['Tables'];

type ExtendedTable<K extends keyof GenTables> = K extends keyof ColumnAdditions
  ? {
      Row: GenTables[K]['Row'] & ColumnAdditions[K]['Row'];
      Insert: GenTables[K]['Insert'] & ColumnAdditions[K]['Insert'];
      Update: GenTables[K]['Update'] & ColumnAdditions[K]['Update'];
      Relationships: GenTables[K] extends { Relationships: infer R } ? R : [];
    }
  : GenTables[K];

type MergedTables = {
  [K in keyof GenTables]: ExtendedTable<K>;
} & AdditionalTables;

/**
 * Extended Database type that merges auto-generated tables
 * with manually-defined additional tables and column additions.
 */
export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Tables'> & {
    Tables: MergedTables;
  };
};
