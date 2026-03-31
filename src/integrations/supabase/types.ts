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
          processo_id: string | null
          reminder_1day: boolean | null
          reminder_30min: boolean | null
          reminder_sent: boolean | null
          responsavel: string | null
          responsavel_id: string | null
          status: string | null
          tenant_id: string
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
          processo_id?: string | null
          reminder_1day?: boolean | null
          reminder_30min?: boolean | null
          reminder_sent?: boolean | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          tenant_id: string
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
          processo_id?: string | null
          reminder_1day?: boolean | null
          reminder_30min?: boolean | null
          reminder_sent?: boolean | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          tenant_id?: string
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
            foreignKeyName: "agendamentos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
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
          context: Json | null
          created_at: string
          error_message: string | null
          execution_id: string | null
          full_result: string | null
          id: string
          latency_ms: number | null
          lead_id: string | null
          model: string | null
          prompt_tokens: number | null
          result_preview: string | null
          status: string | null
          system_prompt: string | null
          tenant_id: string
          total_tokens: number | null
          user_id: string | null
          user_prompt: string | null
        }
        Insert: {
          agent_name: string
          completion_tokens?: number | null
          context?: Json | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          full_result?: string | null
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          model?: string | null
          prompt_tokens?: number | null
          result_preview?: string | null
          status?: string | null
          system_prompt?: string | null
          tenant_id: string
          total_tokens?: number | null
          user_id?: string | null
          user_prompt?: string | null
        }
        Update: {
          agent_name?: string
          completion_tokens?: number | null
          context?: Json | null
          created_at?: string
          error_message?: string | null
          execution_id?: string | null
          full_result?: string | null
          id?: string
          latency_ms?: number | null
          lead_id?: string | null
          model?: string | null
          prompt_tokens?: number | null
          result_preview?: string | null
          status?: string | null
          system_prompt?: string | null
          tenant_id?: string
          total_tokens?: number | null
          user_id?: string | null
          user_prompt?: string | null
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
          {
            foreignKeyName: "agent_ai_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
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
          {
            foreignKeyName: "agent_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_memory: {
        Row: {
          access_count: number
          agent_name: string
          content: string
          created_at: string | null
          embedding: string | null
          expires_at: string | null
          id: string
          importance: number
          last_accessed_at: string | null
          lead_id: string | null
          memory_type: string
          metadata: Json | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          access_count?: number
          agent_name: string
          content: string
          created_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance?: number
          last_accessed_at?: string | null
          lead_id?: string | null
          memory_type?: string
          metadata?: Json | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          access_count?: number
          agent_name?: string
          content?: string
          created_at?: string | null
          embedding?: string | null
          expires_at?: string | null
          id?: string
          importance?: number
          last_accessed_at?: string | null
          lead_id?: string | null
          memory_type?: string
          metadata?: Json | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_memory_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_training_documents: {
        Row: {
          chunks_count: number | null
          created_at: string | null
          error_message: string | null
          extracted_text_preview: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          id: string
          status: string
          storage_path: string | null
          tenant_id: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          chunks_count?: number | null
          created_at?: string | null
          error_message?: string | null
          extracted_text_preview?: string | null
          file_name: string
          file_size_bytes: number
          file_type: string
          id?: string
          status?: string
          storage_path?: string | null
          tenant_id: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          chunks_count?: number | null
          created_at?: string | null
          error_message?: string | null
          extracted_text_preview?: string | null
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          id?: string
          status?: string
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_training_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
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
      assistant_audit: {
        Row: {
          action: string
          created_at: string | null
          error: string | null
          id: string
          query: string | null
          response_time_ms: number | null
          success: boolean
          tenant_id: string
          tools_used: string[] | null
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string | null
          error?: string | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          success?: boolean
          tenant_id: string
          tools_used?: string[] | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          error?: string | null
          id?: string
          query?: string | null
          response_time_ms?: number | null
          success?: boolean
          tenant_id?: string
          tools_used?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      assistant_conversations: {
        Row: {
          created_at: string | null
          id: string
          message_count: number
          messages: Json
          tenant_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_count?: number
          messages?: Json
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_count?: number
          messages?: Json
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          session_id: string | null
          table_name: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          session_id?: string | null
          table_name: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          session_id?: string | null
          table_name?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          created_at: string | null
          duracao_ms: number | null
          erro: string | null
          id: string
          lead_id: string | null
          referencia_id: string
          resultado: Json | null
          status: string
          tenant_id: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          duracao_ms?: number | null
          erro?: string | null
          id?: string
          lead_id?: string | null
          referencia_id: string
          resultado?: Json | null
          status?: string
          tenant_id: string
          tipo: string
        }
        Update: {
          created_at?: string | null
          duracao_ms?: number | null
          erro?: string | null
          id?: string
          lead_id?: string | null
          referencia_id?: string
          resultado?: Json | null
          status?: string
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flow_edges: {
        Row: {
          flow_id: string
          id: string
          label: string | null
          source_handle: string | null
          source_node: string
          target_node: string
        }
        Insert: {
          flow_id: string
          id: string
          label?: string | null
          source_handle?: string | null
          source_node: string
          target_node: string
        }
        Update: {
          flow_id?: string
          id?: string
          label?: string | null
          source_handle?: string | null
          source_node?: string
          target_node?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flow_edges_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flow_nodes: {
        Row: {
          config: Json
          flow_id: string
          id: string
          label: string
          position_x: number
          position_y: number
          tipo: string
        }
        Insert: {
          config?: Json
          flow_id: string
          id: string
          label: string
          position_x?: number
          position_y?: number
          tipo: string
        }
        Update: {
          config?: Json
          flow_id?: string
          id?: string
          label?: string
          position_x?: number
          position_y?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_flow_nodes_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "automation_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_flows: {
        Row: {
          created_at: string | null
          created_by: string | null
          descricao: string | null
          execucoes_total: number | null
          id: string
          nome: string
          status: string
          tenant_id: string
          trigger_config: Json | null
          trigger_type: string
          ultima_execucao: string | null
          updated_at: string | null
          viewport: Json | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          execucoes_total?: number | null
          id?: string
          nome: string
          status?: string
          tenant_id: string
          trigger_config?: Json | null
          trigger_type: string
          ultima_execucao?: string | null
          updated_at?: string | null
          viewport?: Json | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          execucoes_total?: number | null
          id?: string
          nome?: string
          status?: string
          tenant_id?: string
          trigger_config?: Json | null
          trigger_type?: string
          ultima_execucao?: string | null
          updated_at?: string | null
          viewport?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_flows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_flows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rule_actions: {
        Row: {
          config: Json
          id: string
          ordem: number | null
          rule_id: string
          tipo: string
        }
        Insert: {
          config?: Json
          id?: string
          ordem?: number | null
          rule_id: string
          tipo: string
        }
        Update: {
          config?: Json
          id?: string
          ordem?: number | null
          rule_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rule_actions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rule_conditions: {
        Row: {
          campo: string
          id: string
          operador: string
          ordem: number | null
          rule_id: string
          valor: string | null
        }
        Insert: {
          campo: string
          id?: string
          operador: string
          ordem?: number | null
          rule_id: string
          valor?: string | null
        }
        Update: {
          campo?: string
          id?: string
          operador?: string
          ordem?: number | null
          rule_id?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rule_conditions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          descricao: string | null
          evento: string
          execucoes_total: number | null
          id: string
          match_logic: string
          nome: string
          prioridade: number | null
          status: string
          tenant_id: string
          ultima_execucao: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          evento: string
          execucoes_total?: number | null
          id?: string
          match_logic?: string
          nome: string
          prioridade?: number | null
          status?: string
          tenant_id: string
          ultima_execucao?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          evento?: string
          execucoes_total?: number | null
          id?: string
          match_logic?: string
          nome?: string
          prioridade?: number | null
          status?: string
          tenant_id?: string
          ultima_execucao?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_tasks: {
        Row: {
          agendamento_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          tenant_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agendamento_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agendamento_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_tasks_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conexoes_alertas: {
        Row: {
          conexao_id: string
          created_at: string | null
          id: string
          lido: boolean | null
          mensagem: string
          resolvido: boolean | null
          resolvido_em: string | null
          resolvido_por: string | null
          severidade: string
          tenant_id: string
          tipo: string
        }
        Insert: {
          conexao_id: string
          created_at?: string | null
          id?: string
          lido?: boolean | null
          mensagem: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          tenant_id: string
          tipo: string
        }
        Update: {
          conexao_id?: string
          created_at?: string | null
          id?: string
          lido?: boolean | null
          mensagem?: string
          resolvido?: boolean | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_alertas_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conexoes_alertas_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conexoes_logs: {
        Row: {
          conexao_id: string
          created_at: string | null
          descricao: string | null
          evento: string
          id: string
          metadata: Json | null
          origem: string | null
          severidade: string
          tenant_id: string
        }
        Insert: {
          conexao_id: string
          created_at?: string | null
          descricao?: string | null
          evento: string
          id?: string
          metadata?: Json | null
          origem?: string | null
          severidade?: string
          tenant_id: string
        }
        Update: {
          conexao_id?: string
          created_at?: string | null
          descricao?: string | null
          evento?: string
          id?: string
          metadata?: Json | null
          origem?: string | null
          severidade?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_logs_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_whatsapp"
            referencedColumns: ["id"]
          },
        ]
      }
      conexoes_whatsapp: {
        Row: {
          avatar_url: string | null
          config: Json | null
          created_at: string | null
          departamento_id: string | null
          id: string
          instance_name: string | null
          last_error: string | null
          last_heartbeat: string | null
          last_sync: string | null
          nome: string
          provider: string
          reconnect_attempts: number | null
          responsavel_id: string | null
          status: string
          status_padrao: string | null
          telefone: string | null
          tenant_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          config?: Json | null
          created_at?: string | null
          departamento_id?: string | null
          id?: string
          instance_name?: string | null
          last_error?: string | null
          last_heartbeat?: string | null
          last_sync?: string | null
          nome: string
          provider?: string
          reconnect_attempts?: number | null
          responsavel_id?: string | null
          status?: string
          status_padrao?: string | null
          telefone?: string | null
          tenant_id: string
          tipo?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          config?: Json | null
          created_at?: string | null
          departamento_id?: string | null
          id?: string
          instance_name?: string | null
          last_error?: string | null
          last_heartbeat?: string | null
          last_sync?: string | null
          nome?: string
          provider?: string
          reconnect_attempts?: number | null
          responsavel_id?: string | null
          status?: string
          status_padrao?: string | null
          telefone?: string | null
          tenant_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conexoes_whatsapp_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conexoes_whatsapp_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conexoes_whatsapp_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_integracoes: {
        Row: {
          api_key: string
          atualizado_em: string
          created_at: string | null
          criado_em: string
          data_ultima_sincronizacao: string | null
          endpoint_url: string
          id: string
          nome_integracao: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_integracao"]
          tenant_id: string | null
          verify_token: string | null
        }
        Insert: {
          api_key: string
          atualizado_em?: string
          created_at?: string | null
          criado_em?: string
          data_ultima_sincronizacao?: string | null
          endpoint_url: string
          id?: string
          nome_integracao: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_integracao"]
          tenant_id?: string | null
          verify_token?: string | null
        }
        Update: {
          api_key?: string
          atualizado_em?: string
          created_at?: string | null
          criado_em?: string
          data_ultima_sincronizacao?: string | null
          endpoint_url?: string
          id?: string
          nome_integracao?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_integracao"]
          tenant_id?: string | null
          verify_token?: string | null
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
          lead_id: string | null
          link_assinatura_zapsign: string | null
          metadata: Json | null
          nome_cliente: string | null
          numero: string | null
          observacoes: string | null
          responsavel: string | null
          responsavel_id: string | null
          status: string | null
          status_assinatura: string | null
          tenant_id: string
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
          lead_id?: string | null
          link_assinatura_zapsign?: string | null
          metadata?: Json | null
          nome_cliente?: string | null
          numero?: string | null
          observacoes?: string | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          status_assinatura?: string | null
          tenant_id: string
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
          lead_id?: string | null
          link_assinatura_zapsign?: string | null
          metadata?: Json | null
          nome_cliente?: string | null
          numero?: string | null
          observacoes?: string | null
          responsavel?: string | null
          responsavel_id?: string | null
          status?: string | null
          status_assinatura?: string | null
          tenant_id?: string
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
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
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
            foreignKeyName: "conversation_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
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
      crm_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          lead_id: string | null
          metadata: Json | null
          scheduled_at: string | null
          tenant_id: string
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          tenant_id: string
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          scheduled_at?: string | null
          tenant_id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_custom_fields: {
        Row: {
          field_name: string
          field_options: Json | null
          field_type: string
          id: string
          is_required: boolean | null
          position: number | null
          tenant_id: string
        }
        Insert: {
          field_name: string
          field_options?: Json | null
          field_type: string
          id?: string
          is_required?: boolean | null
          position?: number | null
          tenant_id: string
        }
        Update: {
          field_name?: string
          field_options?: Json | null
          field_type?: string
          id?: string
          is_required?: boolean | null
          position?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_custom_fields_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followups: {
        Row: {
          assigned_to: string | null
          auto_message_template: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          followup_type: string
          id: string
          lead_id: string | null
          metadata: Json | null
          priority: string | null
          recurrence_end_at: string | null
          recurrence_rule: string | null
          reminder_minutes: number | null
          scheduled_at: string
          snoozed_until: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          auto_message_template?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          followup_type: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          priority?: string | null
          recurrence_end_at?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          scheduled_at: string
          snoozed_until?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          auto_message_template?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          followup_type?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          priority?: string | null
          recurrence_end_at?: string | null
          recurrence_rule?: string | null
          reminder_minutes?: number | null
          scheduled_at?: string
          snoozed_until?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_custom_values: {
        Row: {
          field_id: string
          id: string
          lead_id: string
          value: string | null
        }
        Insert: {
          field_id: string
          id?: string
          lead_id: string
          value?: string | null
        }
        Update: {
          field_id?: string
          id?: string
          lead_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_custom_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "crm_custom_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_custom_values_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_custom_values_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_scores: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          score: number
          score_factors: Json
          scored_by: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          score: number
          score_factors?: Json
          scored_by: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          score?: number
          score_factors?: Json
          scored_by?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_tags: {
        Row: {
          lead_id: string
          tag_id: string
        }
        Insert: {
          lead_id: string
          tag_id: string
        }
        Update: {
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "crm_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipeline_stages: {
        Row: {
          auto_followup_days: number | null
          color: string | null
          created_at: string | null
          id: string
          is_lost: boolean | null
          is_won: boolean | null
          name: string
          position: number
          slug: string
          tenant_id: string
        }
        Insert: {
          auto_followup_days?: number | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name: string
          position?: number
          slug: string
          tenant_id: string
        }
        Update: {
          auto_followup_days?: number | null
          color?: string | null
          created_at?: string | null
          id?: string
          is_lost?: boolean | null
          is_won?: boolean | null
          name?: string
          position?: number
          slug?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipeline_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tags: {
        Row: {
          color: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departamento_membros: {
        Row: {
          created_at: string | null
          departamento_id: string
          id: string
          pode_arquivar: boolean | null
          pode_atribuir_responsavel: boolean | null
          pode_editar_propriedades: boolean | null
          pode_gerenciar: boolean | null
          pode_mover_leads: boolean | null
          pode_ver_metricas: boolean | null
          pode_ver_todos_leads: boolean | null
          profile_id: string
          receber_notificacoes: boolean | null
          role_no_depto: string | null
        }
        Insert: {
          created_at?: string | null
          departamento_id: string
          id?: string
          pode_arquivar?: boolean | null
          pode_atribuir_responsavel?: boolean | null
          pode_editar_propriedades?: boolean | null
          pode_gerenciar?: boolean | null
          pode_mover_leads?: boolean | null
          pode_ver_metricas?: boolean | null
          pode_ver_todos_leads?: boolean | null
          profile_id: string
          receber_notificacoes?: boolean | null
          role_no_depto?: string | null
        }
        Update: {
          created_at?: string | null
          departamento_id?: string
          id?: string
          pode_arquivar?: boolean | null
          pode_atribuir_responsavel?: boolean | null
          pode_editar_propriedades?: boolean | null
          pode_gerenciar?: boolean | null
          pode_mover_leads?: boolean | null
          pode_ver_metricas?: boolean | null
          pode_ver_todos_leads?: boolean | null
          profile_id?: string
          receber_notificacoes?: boolean | null
          role_no_depto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departamento_membros_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamento_membros_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          agente_ia_padrao_id: string | null
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          responsavel_padrao_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          agente_ia_padrao_id?: string | null
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          responsavel_padrao_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          agente_ia_padrao_id?: string | null
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          responsavel_padrao_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_responsavel_padrao_id_fkey"
            columns: ["responsavel_padrao_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      document_hashes: {
        Row: {
          blockchain_network: string | null
          blockchain_tx_id: string | null
          content_hash: string
          created_at: string | null
          document_type: string
          file_size_bytes: number | null
          hash_algorithm: string
          id: string
          metadata: Json | null
          original_filename: string
          signed_by: string | null
          storage_path: string | null
          tenant_id: string
          updated_at: string | null
          verification_count: number
          verified_at: string | null
        }
        Insert: {
          blockchain_network?: string | null
          blockchain_tx_id?: string | null
          content_hash: string
          created_at?: string | null
          document_type?: string
          file_size_bytes?: number | null
          hash_algorithm?: string
          id?: string
          metadata?: Json | null
          original_filename: string
          signed_by?: string | null
          storage_path?: string | null
          tenant_id: string
          updated_at?: string | null
          verification_count?: number
          verified_at?: string | null
        }
        Update: {
          blockchain_network?: string | null
          blockchain_tx_id?: string | null
          content_hash?: string
          created_at?: string | null
          document_type?: string
          file_size_bytes?: number | null
          hash_algorithm?: string
          id?: string
          metadata?: Json | null
          original_filename?: string
          signed_by?: string | null
          storage_path?: string | null
          tenant_id?: string
          updated_at?: string | null
          verification_count?: number
          verified_at?: string | null
        }
        Relationships: []
      }
      documentos_juridicos: {
        Row: {
          content_hash: string | null
          created_at: string
          descricao: string | null
          hash_algorithm: string | null
          id: string
          lead_id: string | null
          nome_arquivo: string
          nome_original: string
          processo_id: string | null
          storage_path: string
          tags: string[] | null
          tamanho_bytes: number | null
          tenant_id: string
          tipo_documento: string
          tipo_mime: string | null
          updated_at: string | null
          uploaded_by: string | null
          url_publica: string | null
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          descricao?: string | null
          hash_algorithm?: string | null
          id?: string
          lead_id?: string | null
          nome_arquivo: string
          nome_original: string
          processo_id?: string | null
          storage_path: string
          tags?: string[] | null
          tamanho_bytes?: number | null
          tenant_id: string
          tipo_documento: string
          tipo_mime?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url_publica?: string | null
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          descricao?: string | null
          hash_algorithm?: string | null
          id?: string
          lead_id?: string | null
          nome_arquivo?: string
          nome_original?: string
          processo_id?: string | null
          storage_path?: string
          tags?: string[] | null
          tamanho_bytes?: number | null
          tenant_id?: string
          tipo_documento?: string
          tipo_mime?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          url_publica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_juridicos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_juridicos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_juridicos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_juridicos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_juridicos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string
          created_at: string | null
          embedding: string | null
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: []
      }
      drive_folders: {
        Row: {
          agendamento_id: string | null
          created_at: string
          created_by: string | null
          folder_id: string
          folder_name: string
          folder_url: string | null
          id: string
          lead_id: string | null
          subfolders: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          created_by?: string | null
          folder_id: string
          folder_name: string
          folder_url?: string | null
          id?: string
          lead_id?: string | null
          subfolders?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          created_by?: string | null
          folder_id?: string
          folder_name?: string
          folder_url?: string | null
          id?: string
          lead_id?: string | null
          subfolders?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drive_folders_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_folders_tenant_id_fkey"
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
            foreignKeyName: "hitl_requests_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
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
      honorarios: {
        Row: {
          created_at: string
          data_vencimento: string | null
          horas_estimadas: number | null
          id: string
          lead_id: string | null
          observacoes: string | null
          processo_id: string | null
          status: string
          taxa_contingencia: number | null
          tenant_id: string
          tipo: string
          updated_at: string | null
          valor_adiantamento: number | null
          valor_fixo: number | null
          valor_hora: number | null
          valor_recebido: number | null
          valor_total_acordado: number | null
        }
        Insert: {
          created_at?: string
          data_vencimento?: string | null
          horas_estimadas?: number | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          processo_id?: string | null
          status?: string
          taxa_contingencia?: number | null
          tenant_id: string
          tipo?: string
          updated_at?: string | null
          valor_adiantamento?: number | null
          valor_fixo?: number | null
          valor_hora?: number | null
          valor_recebido?: number | null
          valor_total_acordado?: number | null
        }
        Update: {
          created_at?: string
          data_vencimento?: string | null
          horas_estimadas?: number | null
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          processo_id?: string | null
          status?: string
          taxa_contingencia?: number | null
          tenant_id?: string
          tipo?: string
          updated_at?: string | null
          valor_adiantamento?: number | null
          valor_fixo?: number | null
          valor_hora?: number | null
          valor_recebido?: number | null
          valor_total_acordado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "honorarios_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honorarios_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honorarios_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "honorarios_tenant_id_fkey"
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
      lead_historico: {
        Row: {
          campo: string | null
          created_at: string | null
          descricao: string | null
          id: string
          lead_id: string
          metadata: Json | null
          tenant_id: string
          tipo_evento: string
          usuario_id: string | null
          usuario_nome: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id: string
          metadata?: Json | null
          tenant_id: string
          tipo_evento: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          lead_id?: string
          metadata?: Json | null
          tenant_id?: string
          tipo_evento?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_historico_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_historico_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "lead_interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
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
      lead_notas: {
        Row: {
          autor_id: string
          autor_nome: string
          conteudo: string
          created_at: string | null
          fixada: boolean | null
          id: string
          lead_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          autor_id: string
          autor_nome: string
          conteudo: string
          created_at?: string | null
          fixada?: boolean | null
          id?: string
          lead_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          autor_id?: string
          autor_nome?: string
          conteudo?: string
          created_at?: string | null
          fixada?: boolean | null
          id?: string
          lead_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notas_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          area_juridica: string | null
          arquivado_em: string | null
          arquivado_por: string | null
          assigned_at: string | null
          ativo: boolean | null
          company_name: string | null
          conexao_id: string | null
          cpf_cnpj: string | null
          created_at: string | null
          custom_fields: Json | null
          data_reativacao_prevista: string | null
          departamento_id: string | null
          descricao: string | null
          email: string | null
          expected_value: number | null
          followup_count: number | null
          id: string
          inactive_since: string | null
          last_activity_at: string | null
          lead_score: number | null
          lost_at: string | null
          lost_reason: string | null
          metadata: Json | null
          motivo_arquivamento: string | null
          next_followup_at: string | null
          nome: string
          origem: string | null
          pipeline_stage_id: string | null
          prioridade: string | null
          probability: number | null
          proxima_acao: string | null
          proxima_acao_data: string | null
          proximo_responsavel_id: string | null
          responsavel_id: string | null
          score: number | null
          status: string | null
          tags: string[] | null
          telefone: string | null
          temperature: string | null
          tenant_id: string
          ultima_interacao: string | null
          ultimo_contato: string | null
          updated_at: string | null
          valor_causa: number | null
          valor_estimado: number | null
          won_at: string | null
        }
        Insert: {
          area_juridica?: string | null
          arquivado_em?: string | null
          arquivado_por?: string | null
          assigned_at?: string | null
          ativo?: boolean | null
          company_name?: string | null
          conexao_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          data_reativacao_prevista?: string | null
          departamento_id?: string | null
          descricao?: string | null
          email?: string | null
          expected_value?: number | null
          followup_count?: number | null
          id?: string
          inactive_since?: string | null
          last_activity_at?: string | null
          lead_score?: number | null
          lost_at?: string | null
          lost_reason?: string | null
          metadata?: Json | null
          motivo_arquivamento?: string | null
          next_followup_at?: string | null
          nome: string
          origem?: string | null
          pipeline_stage_id?: string | null
          prioridade?: string | null
          probability?: number | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          proximo_responsavel_id?: string | null
          responsavel_id?: string | null
          score?: number | null
          status?: string | null
          tags?: string[] | null
          telefone?: string | null
          temperature?: string | null
          tenant_id: string
          ultima_interacao?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_estimado?: number | null
          won_at?: string | null
        }
        Update: {
          area_juridica?: string | null
          arquivado_em?: string | null
          arquivado_por?: string | null
          assigned_at?: string | null
          ativo?: boolean | null
          company_name?: string | null
          conexao_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          data_reativacao_prevista?: string | null
          departamento_id?: string | null
          descricao?: string | null
          email?: string | null
          expected_value?: number | null
          followup_count?: number | null
          id?: string
          inactive_since?: string | null
          last_activity_at?: string | null
          lead_score?: number | null
          lost_at?: string | null
          lost_reason?: string | null
          metadata?: Json | null
          motivo_arquivamento?: string | null
          next_followup_at?: string | null
          nome?: string
          origem?: string | null
          pipeline_stage_id?: string | null
          prioridade?: string | null
          probability?: number | null
          proxima_acao?: string | null
          proxima_acao_data?: string | null
          proximo_responsavel_id?: string | null
          responsavel_id?: string | null
          score?: number | null
          status?: string | null
          tags?: string[] | null
          telefone?: string | null
          temperature?: string | null
          tenant_id?: string
          ultima_interacao?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_estimado?: number | null
          won_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_conexao"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_leads_departamento"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_arquivado_por_fkey"
            columns: ["arquivado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_proximo_responsavel_id_fkey"
            columns: ["proximo_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      legal_knowledge: {
        Row: {
          content: string
          content_hash: string
          created_at: string
          embedding: string
          id: string
          metadata: Json
          source_id: string
          source_type: string
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string
          embedding: string
          id?: string
          metadata?: Json
          source_id: string
          source_type: string
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string
          embedding?: string
          id?: string
          metadata?: Json
          source_id?: string
          source_type?: string
        }
        Relationships: []
      }
      logs_atividades: {
        Row: {
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          data_hora: string
          departamento_id: string | null
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
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_hora?: string
          departamento_id?: string | null
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
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_hora?: string
          departamento_id?: string | null
          descricao?: string
          detalhes_adicionais?: Json | null
          id?: string
          ip_usuario?: string | null
          modulo?: string
          nome_usuario?: string
          tipo_acao?: Database["public"]["Enums"]["tipo_acao"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_atividades_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_execucao_agentes: {
        Row: {
          agente_id: string | null
          api_key_usado: string | null
          created_at: string | null
          erro_detalhes: string | null
          id: string
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
          id?: string
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
          id?: string
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
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
      prazos_processuais: {
        Row: {
          alertas_dias: number[]
          created_at: string
          data_cumprimento: string | null
          data_prazo: string
          descricao: string
          id: string
          lead_id: string | null
          observacoes: string | null
          processo_id: string | null
          responsavel_id: string | null
          status: string
          tenant_id: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          alertas_dias?: number[]
          created_at?: string
          data_cumprimento?: string | null
          data_prazo: string
          descricao: string
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          processo_id?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          alertas_dias?: number[]
          created_at?: string
          data_cumprimento?: string | null
          data_prazo?: string
          descricao?: string
          id?: string
          lead_id?: string | null
          observacoes?: string | null
          processo_id?: string | null
          responsavel_id?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prazos_processuais_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_processuais_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_processuais_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_processuais_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_processuais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          area_juridica: string | null
          comarca: string | null
          created_at: string
          data_distribuicao: string | null
          data_encerramento: string | null
          fase_processual: string
          id: string
          lead_id: string | null
          metadata: Json | null
          numero_processo: string | null
          observacoes: string | null
          partes_contrarias: string[] | null
          posicao: string
          responsavel_id: string | null
          status: string
          tags: string[] | null
          tenant_id: string
          tipo_acao: string
          tipo_honorario: string | null
          tribunal: string | null
          updated_at: string | null
          valor_causa: number | null
          valor_honorario_acordado: number | null
          vara: string | null
        }
        Insert: {
          area_juridica?: string | null
          comarca?: string | null
          created_at?: string
          data_distribuicao?: string | null
          data_encerramento?: string | null
          fase_processual?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          numero_processo?: string | null
          observacoes?: string | null
          partes_contrarias?: string[] | null
          posicao?: string
          responsavel_id?: string | null
          status?: string
          tags?: string[] | null
          tenant_id: string
          tipo_acao: string
          tipo_honorario?: string | null
          tribunal?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_honorario_acordado?: number | null
          vara?: string | null
        }
        Update: {
          area_juridica?: string | null
          comarca?: string | null
          created_at?: string
          data_distribuicao?: string | null
          data_encerramento?: string | null
          fase_processual?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          numero_processo?: string | null
          observacoes?: string | null
          partes_contrarias?: string[] | null
          posicao?: string
          responsavel_id?: string | null
          status?: string
          tags?: string[] | null
          tenant_id?: string
          tipo_acao?: string
          tipo_honorario?: string | null
          tribunal?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_honorario_acordado?: number | null
          vara?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tenant_id_fkey"
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
          push_token: string | null
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
          push_token?: string | null
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
          push_token?: string | null
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
      rate_limits: {
        Row: {
          count: number
          created_at: string | null
          id: string
          identifier: string
          key: string
          namespace: string
          reset_at: string
          updated_at: string | null
        }
        Insert: {
          count?: number
          created_at?: string | null
          id?: string
          identifier: string
          key: string
          namespace?: string
          reset_at: string
          updated_at?: string | null
        }
        Update: {
          count?: number
          created_at?: string | null
          id?: string
          identifier?: string
          key?: string
          namespace?: string
          reset_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recurring_event_instances: {
        Row: {
          agendamento_id: string | null
          created_at: string
          end_time: string
          google_event_id: string | null
          id: string
          recurring_event_id: string
          start_time: string
          status: string
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          end_time: string
          google_event_id?: string | null
          id?: string
          recurring_event_id: string
          start_time: string
          status?: string
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          recurring_event_id?: string
          start_time?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_event_instances_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_event_instances_recurring_event_id_fkey"
            columns: ["recurring_event_id"]
            isOneToOne: false
            referencedRelation: "recurring_events"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_events: {
        Row: {
          area_juridica: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_date: string | null
          google_event_id: string | null
          id: string
          is_active: boolean | null
          lead_id: string | null
          metadata: Json | null
          responsavel: string | null
          rrule: string
          start_date: string
          tenant_id: string
          timezone: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_juridica?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          google_event_id?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          responsavel?: string | null
          rrule: string
          start_date: string
          tenant_id: string
          timezone?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_juridica?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_date?: string | null
          google_event_id?: string | null
          id?: string
          is_active?: boolean | null
          lead_id?: string | null
          metadata?: Json | null
          responsavel?: string | null
          rrule?: string
          start_date?: string
          tenant_id?: string
          timezone?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          agendamento_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          message: string
          metadata: Json | null
          scheduled_for: string
          sent_at: string | null
          status: string
          tenant_id: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          message: string
          metadata?: Json | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          tenant_id: string
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          message?: string
          metadata?: Json | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      tags: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          cor: string
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          tenant_id: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          cor?: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          tenant_id: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          cor?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          created_at: string
          criador_id: string
          descricao: string | null
          id: string
          lead_id: string | null
          pontos: number | null
          prazo: string | null
          prioridade: string
          responsavel_id: string | null
          status: string
          tenant_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criador_id: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          pontos?: number | null
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          tenant_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criador_id?: string
          descricao?: string | null
          id?: string
          lead_id?: string | null
          pontos?: number | null
          prazo?: string | null
          prioridade?: string
          responsavel_id?: string | null
          status?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_criador_id_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      tickets_suporte: {
        Row: {
          avaliacao: number | null
          conteudo: string
          created_at: string
          criador_id: string
          id: string
          status: string
          tenant_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          avaliacao?: number | null
          conteudo: string
          created_at?: string
          criador_id: string
          id?: string
          status?: string
          tenant_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          avaliacao?: number | null
          conteudo?: string
          created_at?: string
          criador_id?: string
          id?: string
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_suporte_criador_id_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_suporte_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
      webhook_events: {
        Row: {
          created_at: string
          event_id: string
          id: string
          source: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          source: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          source?: string
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
          agent_processed_at: string | null
          agent_status: string | null
          area_juridica: string | null
          contact_name: string | null
          created_at: string
          ia_active: boolean
          id: string
          last_agent_error: string | null
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
          agent_processed_at?: string | null
          agent_status?: string | null
          area_juridica?: string | null
          contact_name?: string | null
          created_at?: string
          ia_active?: boolean
          id?: string
          last_agent_error?: string | null
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
          agent_processed_at?: string | null
          agent_status?: string | null
          area_juridica?: string | null
          contact_name?: string | null
          created_at?: string
          ia_active?: boolean
          id?: string
          last_agent_error?: string | null
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
            foreignKeyName: "whatsapp_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
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
          content: string | null
          conversation_id: string | null
          created_at: string | null
          direction: string | null
          from_number: string | null
          id: string
          lead_id: string | null
          media_url: string | null
          message_id: string | null
          message_text: string | null
          message_type: string | null
          metadata: Json | null
          processed_by_agent: boolean | null
          provider_message_id: string | null
          read: boolean | null
          send_error: string | null
          send_status: string | null
          sender: string | null
          session_id: string | null
          status: string | null
          tenant_id: string | null
          timestamp: string | null
          to_number: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          processed_by_agent?: boolean | null
          provider_message_id?: string | null
          read?: boolean | null
          send_error?: string | null
          send_status?: string | null
          sender?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id?: string | null
          timestamp?: string | null
          to_number?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_url?: string | null
          message_id?: string | null
          message_text?: string | null
          message_type?: string | null
          metadata?: Json | null
          processed_by_agent?: boolean | null
          provider_message_id?: string | null
          read?: boolean | null
          send_error?: string | null
          send_status?: string | null
          sender?: string | null
          session_id?: string | null
          status?: string | null
          tenant_id?: string | null
          timestamp?: string | null
          to_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
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
      workflow_jobs: {
        Row: {
          attempt: number
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          idempotency_key: string | null
          job_type: string
          lock_timeout_seconds: number
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          priority: number
          result: Json | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          attempt?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          job_type: string
          lock_timeout_seconds?: number
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          attempt?: number
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          job_type?: string
          lock_timeout_seconds?: number
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "agent_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "v_leads_operacional"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_recent: {
        Row: {
          changed_fields: string[] | null
          created_at: string | null
          id: string | null
          operation: string | null
          record_id: string | null
          table_name: string | null
          tenant_id: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      mv_agendamentos_metrics: {
        Row: {
          agendamentos_hoje: number | null
          agendamentos_semana: number | null
          refreshed_at: string | null
          tenant_id: string | null
          total_agendamentos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_agentes_metrics: {
        Row: {
          agentes_ativos: number | null
          execucoes_erro: number | null
          execucoes_hoje: number | null
          execucoes_sucesso: number | null
          refreshed_at: string | null
          tenant_id: string | null
          total_execucoes: number | null
        }
        Relationships: []
      }
      mv_contratos_metrics: {
        Row: {
          contratos_assinados: number | null
          refreshed_at: string | null
          tenant_id: string | null
          total_contratos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_dashboard: {
        Row: {
          agendamentos_hoje: number | null
          agendamentos_semana: number | null
          agentes_ativos: number | null
          contratos_assinados: number | null
          execucoes_erro: number | null
          execucoes_hoje: number | null
          execucoes_sucesso: number | null
          leads_novo_mes: number | null
          refreshed_at: string | null
          status_contrato_assinado: number | null
          status_em_atendimento: number | null
          status_em_qualificacao: number | null
          status_lead_perdido: number | null
          status_novo_lead: number | null
          status_proposta_enviada: number | null
          tenant_id: string | null
          total_agendamentos: number | null
          total_contratos: number | null
          total_execucoes: number | null
          total_leads: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_leads_metrics: {
        Row: {
          leads_novo_mes: number | null
          refreshed_at: string | null
          status_contrato_assinado: number | null
          status_em_atendimento: number | null
          status_em_qualificacao: number | null
          status_lead_perdido: number | null
          status_novo_lead: number | null
          status_proposta_enviada: number | null
          tenant_id: string | null
          total_leads: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_leads_por_area: {
        Row: {
          area: string | null
          tenant_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_leads_operacional: {
        Row: {
          area_juridica: string | null
          arquivado_em: string | null
          arquivado_por: string | null
          assigned_at: string | null
          ativo: boolean | null
          company_name: string | null
          conexao_id: string | null
          conexao_nome: string | null
          conexao_telefone: string | null
          cpf_cnpj: string | null
          created_at: string | null
          custom_fields: Json | null
          data_reativacao_prevista: string | null
          departamento_cor: string | null
          departamento_id: string | null
          departamento_nome: string | null
          descricao: string | null
          email: string | null
          expected_value: number | null
          followup_count: number | null
          id: string | null
          inactive_since: string | null
          last_activity_at: string | null
          lead_score: number | null
          lost_at: string | null
          lost_reason: string | null
          metadata: Json | null
          motivo_arquivamento: string | null
          next_followup_at: string | null
          nome: string | null
          origem: string | null
          pipeline_stage_color: string | null
          pipeline_stage_id: string | null
          pipeline_stage_name: string | null
          prioridade: string | null
          probability: number | null
          proxima_acao: string | null
          proxima_acao_data: string | null
          proximo_responsavel_id: string | null
          responsavel_avatar: string | null
          responsavel_email: string | null
          responsavel_id: string | null
          responsavel_nome: string | null
          score: number | null
          status: string | null
          tags: string[] | null
          telefone: string | null
          temperature: string | null
          tenant_id: string | null
          ultima_interacao: string | null
          ultimo_contato: string | null
          updated_at: string | null
          valor_causa: number | null
          valor_estimado: number | null
          won_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_conexao"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "conexoes_whatsapp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_leads_departamento"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_arquivado_por_fkey"
            columns: ["arquivado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "crm_pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_proximo_responsavel_id_fkey"
            columns: ["proximo_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
      check_rate_limit: {
        Args: {
          _identifier: string
          _max_requests: number
          _namespace: string
          _window_seconds: number
        }
        Returns: Json
      }
      claim_next_job: {
        Args: {
          p_job_types?: string[]
          p_tenant_id?: string
          p_worker_id: string
        }
        Returns: {
          attempt: number
          id: string
          job_type: string
          max_attempts: number
          payload: Json
          tenant_id: string
        }[]
      }
      cleanup_old_webhook_events: { Args: never; Returns: number }
      complete_job: {
        Args: { p_job_id: string; p_result?: Json }
        Returns: undefined
      }
      contar_nao_lidas: { Args: { user_id: string }; Returns: number }
      count_distinct_emails: {
        Args: { column_name: string; table_name: string }
        Returns: number
      }
      current_tenant_id: { Args: never; Returns: string }
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
      fail_job: {
        Args: { p_error: string; p_job_id: string }
        Returns: undefined
      }
      generate_recurring_instances: { Args: never; Returns: undefined }
      get_current_tenant_id: { Args: never; Returns: string }
      get_dashboard_metrics: {
        Args: { _tenant_id: string }
        Returns: {
          agendamentos_hoje: number
          agendamentos_semana: number
          agentes_ativos: number
          contratos_assinados: number
          execucoes_erro: number
          execucoes_hoje: number
          execucoes_sucesso: number
          leads_novo_mes: number
          refreshed_at: string
          status_contrato_assinado: number
          status_em_atendimento: number
          status_em_qualificacao: number
          status_lead_perdido: number
          status_novo_lead: number
          status_proposta_enviada: number
          total_agendamentos: number
          total_contratos: number
          total_execucoes: number
          total_leads: number
        }[]
      }
      get_leads_por_area: {
        Args: { _tenant_id: string }
        Returns: {
          area: string
          total: number
        }[]
      }
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
      has_permission:
        | {
            Args: { _action: string; _resource: string; _uid: string }
            Returns: boolean
          }
        | {
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
      increment_unread_count: {
        Args: { conversation_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _uid: string }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_google_token_expired: { Args: { user_id: string }; Returns: boolean }
      marcar_notificacao_lida: {
        Args: { notificacao_id: string; user_id: string }
        Returns: boolean
      }
      marcar_todas_lidas: { Args: { user_id: string }; Returns: number }
      mark_overdue_followups: { Args: never; Returns: number }
      match_documents: {
        Args: {
          filter_tenant_id: string
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      match_legal_documents: {
        Args: {
          filter?: Json
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
          source_id: string
          source_type: string
        }[]
      }
      refresh_dashboard_views: { Args: never; Returns: undefined }
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
      release_stale_locks: { Args: never; Returns: number }
      search_agent_memory: {
        Args: {
          p_agent_name?: string
          p_lead_id?: string
          p_limit?: number
          p_memory_type?: string
          p_tenant_id: string
          p_threshold?: number
          query_embedding: string
        }
        Returns: {
          agent_name: string
          content: string
          created_at: string
          id: string
          importance: number
          memory_type: string
          metadata: Json
          similarity: number
        }[]
      }
      update_system_setting: {
        Args: { _key: string; _user_id: string; _value: string }
        Returns: boolean
      }
      validar_api_key: { Args: { _key_value: string }; Returns: boolean }
      verify_document_hash: {
        Args: { p_content_hash: string; p_tenant_id: string }
        Returns: {
          created_at: string
          document_type: string
          id: string
          original_filename: string
          signed_by: string
          verified: boolean
        }[]
      }
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
