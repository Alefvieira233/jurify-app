/**
 * Extended Database type that adds tables not yet captured
 * by the auto-generated types.ts.
 *
 * These tables exist in the Supabase database but were not included
 * in the last `supabase gen types` run. Once types are regenerated
 * and these tables appear in types.ts, this file can be removed.
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
      budget_limit: number;
      created_at: string | null;
    };
    Insert: {
      id?: string;
      tenant_id?: string;
      usage_date: string;
      tokens_used?: number;
      budget_limit?: number;
      created_at?: string | null;
    };
    Update: {
      id?: string;
      tenant_id?: string;
      usage_date?: string;
      tokens_used?: number;
      budget_limit?: number;
      created_at?: string | null;
    };
    Relationships: [];
  };
}

/**
 * Extended Database type that merges auto-generated tables
 * with manually-defined additional tables.
 */
export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Tables'> & {
    Tables: GeneratedDatabase['public']['Tables'] & AdditionalTables;
  };
};
