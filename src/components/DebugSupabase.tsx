/**
 * 🔍 WAR ROOM DEBUG - DIAGNÓSTICO NÃO-DESTRUTIVO
 * ================================================
 * Componente de debug inteligente para detectar
 * problemas de conexão com Supabase SEM apagar sessão.
 *
 * Features:
 * - Verifica localStorage (SEM APAGAR)
 * - Timeout de 5s para cada operação
 * - Testa env vars
 * - Testa rede com fetch direto
 * - Testa autenticação e database
 * - Logs em tempo real
 * - Preserva sessão do usuário ✅
 * ================================================
 */

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

type LogEntry = {
  time: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
};

export default function DebugSupabase() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, message, type }]);
    console.log(`[DebugSupabase ${time}] ${message}`);
  };

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        addLog('🚀 Iniciando diagnóstico não-destrutivo...', 'info');

        // ============================================
        // STEP 1: VERIFICAR LOCALSTORAGE (SEM LIMPAR)
        // ============================================
        addLog('🔍 Verificando localStorage (sem apagar)...', 'info');
        try {
          const supabaseKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('supabase') || key.includes('sb-'))) {
              supabaseKeys.push(key);
            }
          }
          addLog(`✅ localStorage verificado (${supabaseKeys.length} chaves Supabase encontradas)`, 'success');
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Erro desconhecido';
          addLog(`⚠️ Erro ao verificar localStorage: ${message}`, 'warning');
        }

        // ============================================
        // STEP 2: VERIFICAR ENV VARS
        // ============================================
        addLog('🔍 Verificando variáveis de ambiente...', 'info');

        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!url || url === 'undefined') {
          addLog('❌ VITE_SUPABASE_URL está undefined!', 'error');
          setStatus('error');
          return;
        }

        if (!key || key === 'undefined') {
          addLog('❌ VITE_SUPABASE_ANON_KEY está undefined!', 'error');
          setStatus('error');
          return;
        }

        addLog(`✅ VITE_SUPABASE_URL: ${url.slice(0, 40)}...`, 'success');
        addLog(`✅ VITE_SUPABASE_ANON_KEY: ${key.slice(0, 20)}...`, 'success');

        // ============================================
        // STEP 3: TESTAR REDE COM FETCH DIRETO
        // ============================================
        addLog('🌐 Testando conexão de rede direta...', 'info');

        const networkTimeout = new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout após 5s')), 5000)
        );

        try {
          const networkTest = fetch(`${url}/rest/v1/`, {
            method: 'HEAD',
            headers: {
              'apikey': key,
            },
          });

          const response = await Promise.race([networkTest, networkTimeout]);

          if (response.ok || response.status === 404 || response.status === 400) {
            addLog(`✅ Rede OK (Status: ${response.status})`, 'success');
          } else {
            addLog(`⚠️ Rede respondeu com status: ${response.status}`, 'warning');
          }
        } catch (netErr: unknown) {
          const message = netErr instanceof Error ? netErr.message : 'Erro desconhecido';
          addLog(`❌ Erro de rede: ${message}`, 'error');
          setStatus('error');
          return;
        }

        // ============================================
        // STEP 4: TESTAR AUTH.GETSESSION COM TIMEOUT
        // ============================================
        addLog('🔐 Testando Supabase Auth...', 'info');

        const authTimeout = new Promise<Awaited<ReturnType<typeof supabase.auth.getSession>>>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout após 5s')), 5000)
        );

        try {
          const authTest = supabase.auth.getSession();
          const { data, error } = await Promise.race([authTest, authTimeout]);

          if (error) {
            addLog(`❌ Erro Auth: ${error.message}`, 'error');
            setStatus('error');
            return;
          }

          addLog(`✅ Auth OK (Session: ${data.session ? 'Ativa' : 'Nenhuma'})`, 'success');
        } catch (authErr: unknown) {
          const message = authErr instanceof Error ? authErr.message : 'Erro desconhecido';
          addLog(`❌ Erro Auth: ${message}`, 'error');
          setStatus('error');
          return;
        }

        // ============================================
        // STEP 5: TESTAR DATABASE COM TIMEOUT
        // ============================================
        addLog('🗄️ Testando Database Query...', 'info');

        const dbTimeout = new Promise<{ data: unknown[] | null; error: { message?: string; code?: string } | null }>(
          (_, reject) =>
          setTimeout(() => reject(new Error('Database timeout após 5s')), 5000)
        );

        try {
          const dbTest = supabase
            .from('profiles')
            .select('id')
            .limit(1);

          const { data, error } = await Promise.race([dbTest, dbTimeout]);

          if (error) {
            // PGRST116 = No rows found, mas conexão OK
            if (error.code === 'PGRST116') {
              addLog('✅ Database OK (Tabela vazia)', 'success');
            } else {
              addLog(`⚠️ Database Error: ${error.message} (Code: ${error.code})`, 'warning');
            }
          } else {
            addLog(`✅ Database OK (${data?.length || 0} registros)`, 'success');
          }
        } catch (dbErr: unknown) {
          const message = dbErr instanceof Error ? dbErr.message : 'Erro desconhecido';
          addLog(`❌ Erro Database: ${message}`, 'error');
          setStatus('error');
          return;
        }

        // ============================================
        // SUCESSO!
        // ============================================
        addLog('🎉 TODOS OS TESTES PASSARAM!', 'success');
        setStatus('success');

      } catch (err: unknown) {
        console.error('Erro fatal no diagnóstico:', err);
        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        addLog(`🔴 ERRO FATAL: ${message}`, 'error');
        setStatus('error');
      } finally {
        // ✅ CRÍTICO: Limpar timeout assim que diagnóstico completar
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    // ✅ Timeout de 10s para todo o processo (usando ref)
    timeoutRef.current = setTimeout(() => {
      addLog('⏱️ TIMEOUT GLOBAL (10s) - Processo travado!', 'error');
      setStatus('error');
    }, 10000);

    // Executar diagnóstico imediatamente
    void runDiagnostics();

    // Cleanup no unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Não renderizar em produção
  if (import.meta.env.MODE === 'production') {
    return null;
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success': return { bg: '#0a2e0a', border: '#0f0', icon: '✅' };
      case 'error': return { bg: '#3e0a0a', border: '#f00', icon: '❌' };
      default: return { bg: '#2e2e0a', border: '#ff0', icon: '🔄' };
    }
  };

  const colors = getStatusColor();

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return '#0f0';
      case 'error': return '#f00';
      case 'warning': return '#ff0';
      default: return '#aaa';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 10,
        right: 10,
        width: '450px',
        maxHeight: '80vh',
        background: colors.bg,
        color: 'white',
        border: `3px solid ${colors.border}`,
        padding: 15,
        borderRadius: 8,
        zIndex: 99999,
        fontFamily: 'monospace',
        fontSize: '11px',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px',
        paddingBottom: '10px',
        borderBottom: `2px solid ${colors.border}`,
      }}>
        <span style={{ fontSize: '20px' }}>{colors.icon}</span>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
          WAR ROOM: {status.toUpperCase()}
        </h3>
      </div>

      {/* Logs */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxHeight: '400px',
        overflow: 'auto',
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>Aguardando diagnóstico...</div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              style={{
                color: getLogColor(log.type),
                padding: '4px',
                borderLeft: `3px solid ${getLogColor(log.type)}`,
                paddingLeft: '8px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '2px',
              }}
            >
              <span style={{ color: '#666', fontSize: '10px' }}>[{log.time}]</span>{' '}
              {log.message}
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #444',
        fontSize: '10px',
        color: '#888',
      }}>
        <div>Total Logs: {logs.length}</div>
        <div>Mode: {import.meta.env.MODE}</div>
        <div>Clique para ver console detalhado</div>
      </div>
    </div>
  );
}
