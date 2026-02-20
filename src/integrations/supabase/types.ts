export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      agendamentos: {
        Row: {
          area_juridica: string | null
          contrato_id: string | null
          created_at: string | null
          data_hora: string
          descricao: string | null
          duracao: number | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          lead_id: string | null
          link_videochamada: string | null
          local: string | null
          metadata: Json | null
          observacoes: string | null
          participantes: string[] | null
          reminder_1day: boolean | null
          reminder_30min: boolean | null
          reminder_sent: boolean | null
          responsavel: string | null
          responsavel_id: string | null
          status: string | null
          tenant_id: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          area_juridica?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_hora: string
          descricao?: string | null
          duracao?: number | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          link_videochamada?: string | null
          local?: string | null
          metadata?: Json | null
          observacoes?: string | null
          participantes?: string[] | null
          reminder_1day?: boolean | null
          reminder_30min?: boolean | null
          reminder_sent?: boolean | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          tenant_id?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          area_juridica?: string | null
          contrato_id?: string | null
          created_at?: string | null
          data_hora?: string
          descricao?: string | null
          duracao?: number | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          lead_id?: string | null
          link_videochamada?: string | null
          local?: string | null
          metadata?: Json | null
          observacoes?: string | null
          participantes?: string[] | null
          reminder_1day?: boolean | null
          reminder_30min?: boolean | null
          reminder_sent?: boolean | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          tenant_id?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_ai_logs: {
        Row: {
          agent_name: string
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          execution_id: string | null
          id: string
          latency_ms: number | null
          lead_id: string | null
          model: string | null
          prompt_tokens: number | null
          result_preview: string | null
          status: string | null
          tenant_id: string
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          agent_name: string
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          model?: string | null
          prompt_tokens?: number | null
          result_preview?: string | null
          status?: string | null
          tenant_id: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          agent_name?: string
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          model?: string | null
          prompt_tokens?: number | null
          result_preview?: string | null
          status?: string | null
          tenant_id?: string
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_ai_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "active_executions_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_ai_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "agent_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_ai_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_executions: {
        Row: {
          agents_involved: string[] | null
          created_at: string
          current_agent: string | null
          current_stage: string | null
          estimated_cost_usd: number | null
          execution_id: string
          id: string
          lead_id: string | null
          started_at: string
          status: string
          tenant_id: string
          total_agents_used: number | null
          total_duration_ms: number | null
          total_tokens: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agents_involved?: string[] | null
          created_at?: string
          current_agent?: string | null
          current_stage?: string | null
          estimated_cost_usd?: number | null
          execution_id: string
          id?: string
          lead_id?: string | null
          started_at?: string
          status?: string
          tenant_id: string
          total_agents_used?: number | null
          total_duration_ms?: number | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agents_involved?: string[] | null
          created_at?: string
          current_agent?: string | null
          current_stage?: string | null
          estimated_cost_usd?: number | null
          execution_id?: string
          id?: string
          lead_id?: string | null
          started_at?: string
          status?: string
          tenant_id?: string
          total_agents_used?: number | null
          total_duration_ms?: number | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      agentes_ia: {
        Row: {
          area_juridica: string | null
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          delay_resposta: number | null
          descricao: string | null
          descricao_funcao: string | null
          id: string
          keywords_acao: string[] | null
          max_tokens: number | null
          metricas: Json | null
          modelo_ia: string | null
          nome: string
          objetivo: string | null
          parametros_avancados: Json | null
          perguntas_qualificacao: string[] | null
          prompt_base: string | null
          prompt_sistema: string | null
          script_saudacao: string | null
          status: string | null
          temperatura: number | null
          tenant_id: string | null
          tipo: string
          tipo_agente: string | null
          updated_at: string | null
        }
        Insert: {
          area_juridica?: string | null
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          delay_resposta?: number | null
          descricao?: string | null
          descricao_funcao?: string | null
          id?: string
          keywords_acao?: string[] | null
          max_tokens?: number | null
          metricas?: Json | null
          modelo_ia?: string | null
          nome: string
          objetivo?: string | null
          parametros_avancados?: Json | null
          perguntas_qualificacao?: string[] | null
          prompt_base?: string | null
          prompt_sistema?: string | null
          script_saudacao?: string | null
          status?: string | null
          temperatura?: number | null
          tenant_id?: string | null
          tipo: string
          tipo_agente?: string | null
          updated_at?: string | null
        }
        Update: {
          area_juridica?: string | null
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          delay_resposta?: number | null
          descricao?: string | null
          descricao_funcao?: string | null
          id?: string
          keywords_acao?: string[] | null
          max_tokens?: number | null
          metricas?: Json | null
          modelo_ia?: string | null
          nome?: string
          objetivo?: string | null
          parametros_avancados?: Json | null
          perguntas_qualificacao?: string[] | null
          prompt_base?: string | null
          prompt_sistema?: string | null
          script_saudacao?: string | null
          status?: string | null
          temperatura?: number | null
          tenant_id?: string | null
          tipo?: string
          tipo_agente?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agentes_ia_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agentes_ia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_columns: {
        Row: {
          allowed_columns: string[]
          table_name: string
        }
        Insert: {
          allowed_columns: string[]
          table_name: string
        }
        Update: {
          allowed_columns?: string[]
          table_name?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          id: string
          key_value: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          key_value: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          id?: string
          key_value?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          api_key_id: string | null
          created_at: string
          current_usage: number | null
          daily_limit: number | null
          id: string
          reset_date: string | null
          updated_at: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          current_usage?: number | null
          daily_limit?: number | null
          id?: string
          reset_date?: string | null
          updated_at?: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          current_usage?: number | null
          daily_limit?: number | null
          id?: string
          reset_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_integracoes: {
        Row: {
          api_key: string
          atualizado_em: string
          criado_em: string
          data_ultima_sincronizacao: string | null
          endpoint_url: string
          id: string
          nome_integracao: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_integracao"]
        }
        Insert: {
          api_key: string
          atualizado_em?: string
          criado_em?: string
          data_ultima_sincronizacao?: string | null
          endpoint_url: string
          id?: string
          nome_integracao: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_integracao"]
        }
        Update: {
          api_key?: string
          atualizado_em?: string
          criado_em?: string
          data_ultima_sincronizacao?: string | null
          endpoint_url?: string
          id?: string
          nome_integracao?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_integracao"]
        }
        Relationships: []
      }
      contratos: {
        Row: {
          area_juridica: string | null
          arquivo_url: string | null
          assinatura_digital_url: string | null
          clausulas_customizadas: string | null
          cliente_id: string | null
          created_at: string | null
          data_assinatura: string | null
          data_envio: string | null
          data_envio_whatsapp: string | null
          data_fim: string | null
          data_geracao_link: string | null
          data_inicio: string | null
          descricao: string | null
          honorarios: number | null
          id: string
          link_assinatura_zapsign: string | null
          metadata: Json | null
          nome_cliente: string | null
          numero: string | null
          observacoes: string | null
          responsavel: string | null
          responsavel_id: string | null
          status: string | null
          status_assinatura: string | null
          tenant_id: string | null
          texto_contrato: string | null
          tipo: string | null
          titulo: string
          updated_at: string | null
          valor: number | null
          valor_causa: number | null
          zapsign_document_id: string | null
        }
        Insert: {
          area_juridica?: string | null
          arquivo_url?: string | null
          assinatura_digital_url?: string | null
          clausulas_customizadas?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_assinatura?: string | null
          data_envio?: string | null
          data_envio_whatsapp?: string | null
          data_fim?: string | null
          data_geracao_link?: string | null
          data_inicio?: string | null
          descricao?: string | null
          honorarios?: number | null
          id?: string
          link_assinatura_zapsign?: string | null
          metadata?: Json | null
          nome_cliente?: string | null
          numero?: string | null
          observacoes?: string | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          status_assinatura?: string | null
          tenant_id?: string | null
          texto_contrato?: string | null
          tipo?: string | null
          titulo: string
          updated_at?: string | null
          valor?: number | null
          valor_causa?: number | null
          zapsign_document_id?: string | null
        }
        Update: {
          area_juridica?: string | null
          arquivo_url?: string | null
          assinatura_digital_url?: string | null
          clausulas_customizadas?: string | null
          cliente_id?: string | null
          created_at?: string | null
          data_assinatura?: string | null
          data_envio?: string | null
          data_envio_whatsapp?: string | null
          data_fim?: string | null
          data_geracao_link?: string | null
          data_inicio?: string | null
          descricao?: string | null
          honorarios?: number | null
          id?: string
          link_assinatura_zapsign?: string | null
          metadata?: Json | null
          nome_cliente?: string | null
          numero?: string | null
          observacoes?: string | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          status_assinatura?: string | null
          tenant_id?: string | null
          texto_contrato?: string | null
          tipo?: string | null
          titulo?: string
          updated_at?: string | null
          valor?: number | null
          valor_causa?: number | null
          zapsign_document_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_logs: {
        Row: {
          channel: string | null
          conversation_id: string
          created_at: string | null
          id: string
          lead_id: string | null
          message: string | null
          metadata: Json | null
          receiver_id: string | null
          role: string | null
          sender_id: string | null
          tenant_id: string | null
          type: string | null
        }
        Insert: {
          channel?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json | null
          receiver_id?: string | null
          role?: string | null
          sender_id?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Update: {
          channel?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json | null
          receiver_id?: string | null
          role?: string | null
          sender_id?: string | null
          tenant_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_settings: {
        Row: {
          auto_sync: boolean | null
          calendar_enabled: boolean | null
          calendar_id: string | null
          created_at: string
          id: string
          notification_enabled: boolean | null
          sync_direction: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_sync?: boolean | null
          calendar_enabled?: boolean | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          notification_enabled?: boolean | null
          sync_direction?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_sync?: boolean | null
          calendar_enabled?: boolean | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          notification_enabled?: boolean | null
          sync_direction?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_sync_logs: {
        Row: {
          action: string
          agendamento_id: string | null
          created_at: string
          error_message: string | null
          google_event_id: string | null
          id: string
          status: string
          sync_data: Json | null
          user_id: string
        }
        Insert: {
          action: string
          agendamento_id?: string | null
          created_at?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          status: string
          sync_data?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          agendamento_id?: string | null
          created_at?: string
          error_message?: string | null
          google_event_id?: string | null
          id?: string
          status?: string
          sync_data?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_watches: {
        Row: {
          channel_id: string
          created_at: string | null
          expires_at: string
          id: string
          resource_id: string
          user_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          resource_id: string
          user_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          resource_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hitl_requests: {
        Row: {
          ai_confidence: number | null
          ai_proposed_response: string | null
          assigned_to: string | null
          context_data: Json | null
          conversation_id: string | null
          created_at: string | null
          expires_at: string | null
          human_response: string | null
          id: string
          lead_id: string | null
          original_message: string | null
          rejection_reason: string | null
          request_type: string
          resolved_at: string | null
          resolved_by: string | null
          risk_level: string | null
          status: string | null
          tenant_id: string | null
          ttl_minutes: number | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_proposed_response?: string | null
          assigned_to?: string | null
          context_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          human_response?: string | null
          id?: string
          lead_id?: string | null
          original_message?: string | null
          rejection_reason?: string | null
          request_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string | null
          status?: string | null
          tenant_id?: string | null
          ttl_minutes?: number | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_proposed_response?: string | null
          assigned_to?: string | null
          context_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          human_response?: string | null
          id?: string
          lead_id?: string | null
          original_message?: string | null
          rejection_reason?: string | null
          request_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          risk_level?: string | null
          status?: string | null
          tenant_id?: string | null
          ttl_minutes?: number | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hitl_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitl_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitl_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hitl_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          area_juridica: string | null
          ativo: boolean | null
          categoria: string | null
          content: string
          created_at: string | null
          created_by: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          source: string | null
          source_url: string | null
          tags: string[] | null
          tenant_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          area_juridica?: string | null
          ativo?: boolean | null
          categoria?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          source_url?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          area_juridica?: string | null
          ativo?: boolean | null
          categoria?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          source_url?: string | null
          tags?: string[] | null
          tenant_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_base_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_interactions: {
        Row: {
          channel: string | null
          created_at: string | null
          duration: number | null
          executado_por: string | null
          id: string
          lead_id: string | null
          message: string | null
          metadata: Json | null
          outcome: string | null
          response: string | null
          sentiment: string | null
          tenant_id: string | null
          tipo: string
          titulo: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string | null
          duration?: number | null
          executado_por?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json | null
          outcome?: string | null
          response?: string | null
          sentiment?: string | null
          tenant_id?: string | null
          tipo: string
          titulo?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string | null
          duration?: number | null
          executado_por?: string | null
          id?: string
          lead_id?: string | null
          message?: string | null
          metadata?: Json | null
          outcome?: string | null
          response?: string | null
          sentiment?: string | null
          tenant_id?: string | null
          tipo?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_interactions_executado_por_fkey"
            columns: ["executado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          area_juridica: string | null
          ativo: boolean | null
          cpf_cnpj: string | null
          created_at: string | null
          custom_fields: Json | null
          descricao: string | null
          email: string | null
          id: string
          metadata: Json | null
          nome: string
          origem: string | null
          prioridade: string | null
          responsavel_id: string | null
          score: number | null
          status: string | null
          tags: string[] | null
          telefone: string | null
          tenant_id: string | null
          ultimo_contato: string | null
          updated_at: string | null
          valor_causa: number | null
          valor_estimado: number | null
        }
        Insert: {
          area_juridica?: string | null
          ativo?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          descricao?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          nome: string
          origem?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          score?: number | null
          status?: string | null
          tags?: string[] | null
          telefone?: string | null
          tenant_id?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_estimado?: number | null
        }
        Update: {
          area_juridica?: string | null
          ativo?: boolean | null
          cpf_cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          descricao?: string | null
          email?: string | null
          id?: string
          metadata?: Json | null
          nome?: string
          origem?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          score?: number | null
          status?: string | null
          tags?: string[] | null
          telefone?: string | null
          tenant_id?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_atividades: {
        Row: {
          created_at: string
          data_hora: string
          descricao: string
          detalhes_adicionais: Json | null
          id: string
          ip_usuario: string | null
          modulo: string
          nome_usuario: string
          tipo_acao: Database["public"]["Enums"]["tipo_acao"]
          usuario_id: string
        }
        Insert: {
          created_at?: string
          data_hora?: string
          descricao: string
          detalhes_adicionais?: Json | null
          id?: string
          ip_usuario?: string | null
          modulo: string
          nome_usuario: string
          tipo_acao: Database["public"]["Enums"]["tipo_acao"]
          usuario_id: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          descricao?: string
          detalhes_adicionais?: Json | null
          id?: string
          ip_usuario?: string | null
          modulo?: string
          nome_usuario?: string
          tipo_acao?: Database["public"]["Enums"]["tipo_acao"]
          usuario_id?: string
        }
        Relationships: []
      }
      logs_execucao_agentes: {
        Row: {
          agente_id: string | null
          api_key_usado: string | null
          created_at: string | null
          erro_detalhes: string | null
          input_recebido: string
          n8n_error: string | null
          n8n_response: Json | null
          n8n_status: string | null
          n8n_webhook_url: string | null
          resposta_ia: string | null
          status: string
          tempo_execucao: number | null
          tenant_id: string | null
        }
        Insert: {
          agente_id?: string | null
          api_key_usado?: string | null
          created_at?: string | null
          erro_detalhes?: string | null
          input_recebido: string
          n8n_error?: string | null
          n8n_response?: Json | null
          n8n_status?: string | null
          n8n_webhook_url?: string | null
          resposta_ia?: string | null
          status?: string
          tempo_execucao?: number | null
          tenant_id?: string | null
        }
        Update: {
          agente_id?: string | null
          api_key_usado?: string | null
          created_at?: string | null
          erro_detalhes?: string | null
          input_recebido?: string
          n8n_error?: string | null
          n8n_response?: Json | null
          n8n_status?: string | null
          n8n_webhook_url?: string | null
          resposta_ia?: string | null
          status?: string
          tempo_execucao?: number | null
          tenant_id?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          ativo: boolean | null
          created_at: string
          created_by: string | null
          data_criacao: string
          id: string
          lido_por: string[] | null
          mensagem: string
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["notification_type"]
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          data_criacao?: string
          id?: string
          lido_por?: string[] | null
          mensagem: string
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["notification_type"]
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          data_criacao?: string
          id?: string
          lido_por?: string[] | null
          mensagem?: string
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["notification_type"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          is_active: boolean | null
          name: string
          roles_enabled: string[] | null
          template: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          is_active?: boolean | null
          name: string
          roles_enabled?: string[] | null
          template: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          roles_enabled?: string[] | null
          template?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          amount: number
          created_at: string | null
          external_reference: string | null
          id: string
          payer_email: string | null
          payer_id: string | null
          payment_id: string | null
          payment_method: string | null
          payment_method_id: string | null
          preference_id: string | null
          status: string | null
          status_detail: string | null
          subscription_id: string | null
          tenant_id: string | null
          title: string | null
          transaction_amount: number | null
          updated_at: string | null
          webhook_data: Json | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          external_reference?: string | null
          id?: string
          payer_email?: string | null
          payer_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          preference_id?: string | null
          status?: string | null
          status_detail?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          title?: string | null
          transaction_amount?: number | null
          updated_at?: string | null
          webhook_data?: Json | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          external_reference?: string | null
          id?: string
          payer_email?: string | null
          payer_id?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_method_id?: string | null
          preference_id?: string | null
          status?: string | null
          status_detail?: string | null
          subscription_id?: string | null
          tenant_id?: string | null
          title?: string | null
          transaction_amount?: number | null
          updated_at?: string | null
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          cargo: string | null
          created_at: string | null
          email: string
          id: string
          last_login: string | null
          metadata: Json | null
          nome_completo: string | null
          permissions: Json | null
          preferences: Json | null
          role: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          email: string
          id: string
          last_login?: string | null
          metadata?: Json | null
          nome_completo?: string | null
          permissions?: Json | null
          preferences?: Json | null
          role?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_login?: string | null
          metadata?: Json | null
          nome_completo?: string | null
          permissions?: Json | null
          preferences?: Json | null
          role?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          module: Database["public"]["Enums"]["app_module"]
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      security_audit: {
        Row: {
          action: string | null
          changes: Json | null
          created_at: string | null
          event_category: string | null
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          outcome: string | null
          resource_id: string | null
          resource_type: string | null
          severity: string | null
          tenant_id: string | null
          trace_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          changes?: Json | null
          created_at?: string | null
          event_category?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          outcome?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          tenant_id?: string | null
          trace_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          changes?: Json | null
          created_at?: string | null
          event_category?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          outcome?: string | null
          resource_id?: string | null
          resource_type?: string | null
          severity?: string | null
          tenant_id?: string | null
          trace_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          limits: Json | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          billing_type: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string
          current_period_start: string
          failed_payment_count: number | null
          id: string
          is_trial: boolean | null
          last_payment_date: string | null
          metadata: Json | null
          next_payment_date: string | null
          payment_method_id: string | null
          payment_provider: string | null
          plan_id: string | null
          plan_name: string | null
          plan_tier: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          usage_limits: Json | null
        }
        Insert: {
          amount: number
          billing_type?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end: string
          current_period_start: string
          failed_payment_count?: number | null
          id?: string
          is_trial?: boolean | null
          last_payment_date?: string | null
          metadata?: Json | null
          next_payment_date?: string | null
          payment_method_id?: string | null
          payment_provider?: string | null
          plan_id?: string | null
          plan_name?: string | null
          plan_tier?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          usage_limits?: Json | null
        }
        Update: {
          amount?: number
          billing_type?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string
          current_period_start?: string
          failed_payment_count?: number | null
          id?: string
          is_trial?: boolean | null
          last_payment_date?: string | null
          metadata?: Json | null
          next_payment_date?: string | null
          payment_method_id?: string | null
          payment_provider?: string | null
          plan_id?: string | null
          plan_name?: string | null
          plan_tier?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          usage_limits?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_sensitive: boolean | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_sensitive?: boolean | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      tenants: {
        Row: {
          ativo: boolean | null
          configuracoes: Json | null
          created_at: string | null
          email: string | null
          id: string
          logo_url: string | null
          max_agentes: number | null
          max_leads: number | null
          max_usuarios: number | null
          max_whatsapp_sessions: number | null
          metadata: Json | null
          nome: string
          plano: string | null
          slug: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_agentes?: number | null
          max_leads?: number | null
          max_usuarios?: number | null
          max_whatsapp_sessions?: number | null
          metadata?: Json | null
          nome: string
          plano?: string | null
          slug: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          configuracoes?: Json | null
          created_at?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          max_agentes?: number | null
          max_leads?: number | null
          max_usuarios?: number | null
          max_whatsapp_sessions?: number | null
          metadata?: Json | null
          nome?: string
          plano?: string | null
          slug?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          action: string
          created_at: string
          granted: boolean
          id: string
          resource: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          granted?: boolean
          id?: string
          resource: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          granted?: boolean
          id?: string
          resource?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          error_message: string | null
          event_type: string | null
          headers: Json | null
          id: string
          payload: Json | null
          processed_at: string | null
          response: Json | null
          service: string
          status_code: number | null
        }
        Insert: {
          error_message?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          response?: Json | null
          service: string
          status_code?: number | null
        }
        Update: {
          error_message?: string | null
          event_type?: string | null
          headers?: Json | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          response?: Json | null
          service?: string
          status_code?: number | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          area_juridica: string | null
          contact_name: string | null
          created_at: string
          ia_active: boolean
          id: string
          last_message: string | null
          last_message_at: string
          lead_id: string | null
          phone_number: string
          status: string
          tenant_id: string
          unread_count: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          area_juridica?: string | null
          contact_name?: string | null
          created_at?: string
          ia_active?: boolean
          id?: string
          last_message?: string | null
          last_message_at?: string
          lead_id?: string | null
          phone_number: string
          status?: string
          tenant_id: string
          unread_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          area_juridica?: string | null
          contact_name?: string | null
          created_at?: string
          ia_active?: boolean
          id?: string
          last_message?: string | null
          last_message_at?: string
          lead_id?: string | null
          phone_number?: string
          status?: string
          tenant_id?: string
          unread_count?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          created_at: string | null
          direction: string
          from_number: string | null
          id: string
          lead_id: string | null
          media_url: string | null
          message_id: string | null
          message_text: string | null
          message_type: string | null
          metadata: Json | null
          session_id: string
          status: string | null
          tenant_id: string | null
          timestamp: string | null
          to_number: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          session_id: string
          status?: string | null
          tenant_id?: string | null
          timestamp?: string | null
          to_number?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          session_id?: string
          status?: string | null
          tenant_id?: string | null
          timestamp?: string | null
          to_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          connection_status: string | null
          created_at: string | null
          device_info: Json | null
          id: string
          is_connected: boolean | null
          last_seen: string | null
          metadata: Json | null
          pairing_code: string | null
          phone_number: string | null
          qr_code: string | null
          session_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          connection_status?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_connected?: boolean | null
          last_seen?: string | null
          metadata?: Json | null
          pairing_code?: string | null
          phone_number?: string | null
          qr_code?: string | null
          session_id: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          connection_status?: string | null
          created_at?: string | null
          device_info?: Json | null
          id?: string
          is_connected?: boolean | null
          last_seen?: string | null
          metadata?: Json | null
          pairing_code?: string | null
          phone_number?: string | null
          qr_code?: string | null
          session_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      zapsign_logs: {
        Row: {
          contrato_id: string | null
          created_at: string
          dados_evento: Json | null
          data_evento: string
          evento: string
          id: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          dados_evento?: Json | null
          data_evento?: string
          evento: string
          id?: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          dados_evento?: Json | null
          data_evento?: string
          evento?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_executions_view: {
        Row: {
          agents_involved: string[] | null
          created_at: string | null
          current_agent: string | null
          current_stage: string | null
          estimated_cost_usd: number | null
          execution_id: string | null
          id: string | null
          lead_email: string | null
          lead_id: string | null
          lead_nome: string | null
          started_at: string | null
          status: string | null
          tenant_id: string | null
          total_agents_used: number | null
          total_duration_ms: number | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      apply_rls_defaults: {
        Args: { _mode?: string; _table: string }
        Returns: undefined
      }
      buscar_agente_para_execucao: {
        Args: { _agente_id: string }
        Returns: {
          descricao_funcao: string
          id: string
          nome: string
          parametros_avancados: Json
          prompt_base: string
          status: string
          tipo_agente: string
        }[]
      }
      buscar_logs_atividades: {
        Args: {
          _data_fim?: string
          _data_inicio?: string
          _limite?: number
          _modulo?: string
          _offset?: number
          _tipo_acao?: Database["public"]["Enums"]["tipo_acao"]
          _usuario_id?: string
        }
        Returns: {
          data_hora: string
          descricao: string
          detalhes_adicionais: Json
          id: string
          ip_usuario: string
          modulo: string
          nome_usuario: string
          tipo_acao: Database["public"]["Enums"]["tipo_acao"]
          total_count: number
          usuario_id: string
        }[]
      }
      contar_nao_lidas: { Args: { user_id: string }; Returns: number }
      count_distinct_emails: {
        Args: { column_name: string; table_name: string }
        Returns: number
      }
      ensure_policy: {
        Args: {
          _check?: string
          _command: string
          _policy: string
          _table: string
          _using: string
        }
        Returns: undefined
      }
      exec_sql: { Args: { sql_query: string }; Returns: string }
      get_system_setting: { Args: { _key: string }; Returns: string }
      get_user_calendar_settings: {
        Args: { user_id: string }
        Returns: {
          auto_sync: boolean
          calendar_enabled: boolean
          calendar_id: string
          notification_enabled: boolean
          sync_direction: string
        }[]
      }
      get_user_tenant_id: { Args: never; Returns: string }
      has_permission: {
        Args: {
          _module: Database["public"]["Enums"]["app_module"]
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_google_token_expired: { Args: { user_id: string }; Returns: boolean }
      marcar_notificacao_lida: {
        Args: { notificacao_id: string; user_id: string }
        Returns: boolean
      }
      marcar_todas_lidas: { Args: { user_id: string }; Returns: number }
      registrar_log_atividade: {
        Args: {
          _descricao: string
          _detalhes_adicionais?: Json
          _ip_usuario?: string
          _modulo: string
          _nome_usuario: string
          _tipo_acao: Database["public"]["Enums"]["tipo_acao"]
          _usuario_id: string
        }
        Returns: string
      }
      update_system_setting: {
        Args: { _key: string; _user_id: string; _value: string }
        Returns: boolean
      }
      validar_api_key: { Args: { _key_value: string }; Returns: boolean }
    }
    Enums: {
      app_module:
        | "leads"
        | "contratos"
        | "agendamentos"
        | "relatorios"
        | "configuracoes"
        | "whatsapp_ia"
        | "usuarios"
      app_permission: "create" | "read" | "update" | "delete" | "manage"
      app_role:
        | "administrador"
        | "advogado"
        | "comercial"
        | "pos_venda"
        | "suporte"
      notification_type: "info" | "alerta" | "sucesso" | "erro"
      status_integracao: "ativa" | "inativa" | "erro"
      tipo_acao:
        | "criacao"
        | "edicao"
        | "exclusao"
        | "login"
        | "logout"
        | "erro"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "leads",
        "contratos",
        "agendamentos",
        "relatorios",
        "configuracoes",
        "whatsapp_ia",
        "usuarios",
      ],
      app_permission: ["create", "read", "update", "delete", "manage"],
      app_role: [
        "administrador",
        "advogado",
        "comercial",
        "pos_venda",
        "suporte",
      ],
      notification_type: ["info", "alerta", "sucesso", "erro"],
      status_integracao: ["ativa", "inativa", "erro"],
      tipo_acao: [
        "criacao",
        "edicao",
        "exclusao",
        "login",
        "logout",
        "erro",
        "outro",
      ],
    },
  },
} as const
