// Mock do Supabase para desenvolvimento sem backend
// Este arquivo simula respostas do Supabase para testar o frontend


// Event emitter simples para gerenciar listeners
const authListeners: Array<(event: string, session: any) => void> = [];

const notifyListeners = (event: string, session: any) => {
  console.log(`🧪 [MOCK] Notificando ${authListeners.length} listeners: ${event}`);
  authListeners.forEach(listener => listener(event, session));
};

export const mockSupabaseClient = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      console.log('🧪 [MOCK] Tentativa de login:', email);

      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 500));

      // Aceitar qualquer email/senha para testes
      if (email && password) {
        const session = {
          access_token: 'mock-token-123',
          refresh_token: 'mock-refresh-123',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'mock-user-123',
            email: email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {
              nome_completo: 'Usuário Teste'
            }
          }
        };
        
        // Persistir sessão
        localStorage.setItem('mock_session', JSON.stringify(session));
        
        // Notificar listeners
        notifyListeners('SIGNED_IN', session);

        return {
          data: {
            user: session.user,
            session: session
          },
          error: null
        };
      }

      return {
        data: { user: null, session: null },
        error: { message: 'Invalid credentials', status: 400 }
      };
    },

    signUp: async ({ email, password }: { email: string; password: string }) => {
      console.log('🧪 [MOCK] Cadastro:', email);

      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Para signup, geralmente não logamos automaticamente no mock, ou sim?
      // Vamos simular sucesso apenas.
      return {
        data: {
          user: {
            id: 'mock-user-' + Date.now(),
            email: email,
            created_at: new Date().toISOString()
          },
          session: null
        },
        error: null
      };
    },

    signOut: async () => {
      console.log('🧪 [MOCK] Logout');
      localStorage.removeItem('mock_session');
      notifyListeners('SIGNED_OUT', null);
      return { error: null };
    },

    getSession: async () => {
      console.log('🧪 [MOCK] Verificando sessão');

      // Retornar sessão válida se houver no localStorage
      const savedSession = localStorage.getItem('mock_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          return { data: { session }, error: null };
        } catch {
          return { data: { session: null }, error: null };
        }
      }

      return { data: { session: null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      console.log('🧪 [MOCK] Auth state listener registrado');
      
      authListeners.push(callback);

      // Simular verificação inicial
      setTimeout(() => {
        const savedSession = localStorage.getItem('mock_session');
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            callback('SIGNED_IN', session);
          } catch {
            callback('SIGNED_OUT', null);
          }
        } else {
          callback('SIGNED_OUT', null);
        }
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              console.log('🧪 [MOCK] Auth listener removido');
              const index = authListeners.indexOf(callback);
              if (index > -1) {
                authListeners.splice(index, 1);
              }
            }
          }
        }
      };
    }
  },


  from: (table: string) => ({
    select: (columns = '*') => ({
      order: (column: string, options?: any) => ({
        then: async (resolve: (value: any) => void) => {
          console.log(`🧪 [MOCK] SELECT from ${table}`);

          // Mock de dados baseado na tabela
          const mockData: Record<string, any[]> = {
            leads: [
              {
                id: '1',
                nome_completo: 'João Silva',
                email: 'joao@example.com',
                telefone: '11999999999',
                area_juridica: 'Civil',
                status: 'novo_lead',
                origem: 'Website',
                responsavel: 'Maria',
                valor_causa: 50000,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: '2',
                nome_completo: 'Ana Santos',
                email: 'ana@example.com',
                telefone: '11988888888',
                area_juridica: 'Trabalhista',
                status: 'em_qualificacao',
                origem: 'Indicação',
                responsavel: 'Pedro',
                valor_causa: 150000,
                created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                updated_at: new Date().toISOString()
              },
              {
                id: '3',
                nome_completo: 'Empresa XYZ',
                email: 'contato@xyz.com',
                telefone: '11977777777',
                area_juridica: 'Empresarial',
                status: 'proposta_enviada',
                origem: 'Linkedin',
                responsavel: 'Maria',
                valor_causa: 500000,
                created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
                updated_at: new Date().toISOString()
              }
            ],
            profiles: [
              {
                id: 'mock-user-123',
                nome_completo: 'Usuário Teste',
                email: 'teste@jurify.com',
                role: 'admin',
                tenant_id: 'tenant-123',
                ativo: true,
                created_at: new Date().toISOString()
              }
            ],
            contratos: [
              {
                id: '1',
                nome_cliente: 'João Silva',
                lead_id: '1',
                area_juridica: 'Civil',
                status: 'em_analise',
                valor_causa: 50000,
                responsavel: 'Maria',
                texto_contrato: 'Contrato de prestação de serviços advocatícios...',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: '2',
                nome_cliente: 'Empresa XYZ',
                lead_id: '3',
                area_juridica: 'Empresarial',
                status: 'assinado',
                valor_causa: 500000,
                responsavel: 'Maria',
                texto_contrato: 'Contrato de consultoria empresarial...',
                created_at: new Date(Date.now() - 86400000).toISOString(),
                updated_at: new Date().toISOString(),
                data_assinatura: new Date().toISOString()
              }
            ],
            agendamentos: [
              {
                id: '1',
                lead_id: '1',
                data_hora: new Date(Date.now() + 86400000).toISOString(), // Amanhã
                status: 'agendado',
                responsavel: 'Maria',
                area_juridica: 'Civil',
                observacoes: 'Reunião inicial',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: '2',
                lead_id: '2',
                data_hora: new Date(Date.now() + 172800000).toISOString(), // Depois de amanhã
                status: 'confirmado',
                responsavel: 'Pedro',
                area_juridica: 'Trabalhista',
                observacoes: 'Assinatura de procuração',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ],
            agentes_ia: [
              {
                id: '1',
                nome: 'Assistente de Triagem',
                objetivo: 'Qualificar leads iniciais',
                descricao_funcao: 'Realiza perguntas básicas para qualificar o lead',
                prompt_base: 'Você é um assistente jurídico...',
                script_saudacao: 'Olá, como posso ajudar?',
                area_juridica: 'Geral',
                status: 'ativo',
                tipo_agente: 'chat_interno',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              {
                id: '2',
                nome: 'Especialista Trabalhista',
                objetivo: 'Analisar casos trabalhistas',
                descricao_funcao: 'Analisa reclamações trabalhistas',
                prompt_base: 'Você é especialista em direito do trabalho...',
                script_saudacao: 'Olá, conte-me sobre seu caso trabalhista.',
                area_juridica: 'Trabalhista',
                status: 'ativo',
                tipo_agente: 'analise_dados',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ],
            logs_execucao_agentes: [
              {
                id: '1',
                agente_id: '1',
                input_recebido: 'Tenho uma dúvida sobre divórcio',
                resposta_ia: 'Posso ajudar com isso. O divórcio é consensual?',
                status: 'sucesso',
                tempo_execucao: 1.5,
                created_at: new Date().toISOString()
              },
              {
                id: '2',
                agente_id: '1',
                input_recebido: 'Quero processar meu vizinho',
                resposta_ia: 'Entendo. Qual o motivo do processo?',
                status: 'sucesso',
                tempo_execucao: 1.2,
                created_at: new Date(Date.now() - 3600000).toISOString()
              }
            ],
            api_keys: [
              {
                id: '1',
                nome: 'Chave Principal',
                key_value: 'sk-mock-key-123',
                ativo: true,
                created_at: new Date().toISOString()
              }
            ],
            notificacoes: [
              {
                id: '1',
                titulo: 'Novo Lead Cadastrado',
                mensagem: 'João Silva acabou de se cadastrar',
                tipo: 'info',
                ativo: true,
                data_criacao: new Date().toISOString(),
                created_at: new Date().toISOString(),
                lido_por: []
              },
              {
                id: '2',
                titulo: 'Contrato Assinado',
                mensagem: 'Empresa XYZ assinou o contrato',
                tipo: 'sucesso',
                ativo: true,
                data_criacao: new Date(Date.now() - 3600000).toISOString(),
                created_at: new Date(Date.now() - 3600000).toISOString(),
                lido_por: []
              }
            ]
          };

          resolve({
            data: mockData[table] || [],
            error: null
          });
        }
      }),
      eq: function(column: string, value: any) {
        return {
          single: async () => {
            console.log(`🧪 [MOCK] SELECT from ${table} WHERE ${column} = ${value}`);

            if (table === 'profiles' && column === 'id') {
              return {
                data: {
                  id: value,
                  nome_completo: 'Usuário Teste',
                  email: 'teste@jurify.com',
                  role: 'admin',
                  tenant_id: 'tenant-123'
                },
                error: null
              };
            }

            return { data: null, error: null };
          }
        };
      }
    })
  }),

  rpc: async (functionName: string, params: any) => {
    console.log(`🧪 [MOCK] RPC call: ${functionName}`, params);
    return { data: null, error: null };
  }
};
