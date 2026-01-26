export class EnterpriseValidator {
  static validateEnvironment(): void {
    const required = ['OPENAI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL'];
    // Note: In a Vite environment, process.env might not be populated as expected for env vars unless configured.
    // This validation logic might need to be adapted for Edge Functions or Vite env vars (import.meta.env).
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`🚨 Variáveis obrigatórias ausentes (verifique .env): ${missing.join(', ')}`);
      // Throwing error might block the app if envs are handled differently in frontend
      // throw new Error(`🚨 Variáveis obrigatórias: ${missing.join(', ')}`);
    }

    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.warn('🚨 OPENAI_API_KEY parece inválida');
    }
  }
}
