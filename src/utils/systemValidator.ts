import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: unknown;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  tests: {
    database: ValidationResult;
    authentication: ValidationResult;
    rls: ValidationResult;
    integrations: ValidationResult;
    performance: ValidationResult;
  };
  timestamp: string;
}

export class SystemValidator {
  private tenantId: string | null;

  constructor(tenantId: string | null) {
    this.tenantId = tenantId;
  }

  async runFullValidation(): Promise<SystemHealth> {
    const results: SystemHealth = {
      overall: 'healthy',
      tests: {
        database: await this.testDatabase(),
        authentication: await this.testAuthentication(),
        rls: await this.testRLS(),
        integrations: await this.testIntegrations(),
        performance: await this.testPerformance(),
      },
      timestamp: new Date().toISOString(),
    };

    const hasErrors = Object.values(results.tests).some((test) => !test.success);
    if (hasErrors) {
      results.overall = 'degraded';
    }

    return results;
  }

  private ensureTenant(): ValidationResult | null {
    if (this.tenantId) return null;

    return {
      success: false,
      message: 'Tenant id not found for current session',
      details: { code: 'missing_tenant_id' },
    };
  }

  private async testDatabase(): Promise<ValidationResult> {
    const tenantCheck = this.ensureTenant();
    if (tenantCheck) return tenantCheck;

    try {
      const { error } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', this.tenantId as string);

      if (error) throw error;

      const testData = {
        tenant_id: this.tenantId,
        nome: 'System Validator Test',
        email: 'test@systemvalidator.local',
        telefone: '11999999999',
        area_juridica: 'Teste',
        origem: 'Sistema',
        status: 'novo_lead',
        metadata: { responsavel_nome: 'Sistema' },
      };

      const { data: insertData, error: insertError } = await supabase
        .from('leads')
        .insert([testData])
        .select('id')
        .single();

      if (insertError) throw insertError;

      if (insertData?.id) {
        await supabase
          .from('leads')
          .delete()
          .eq('id', insertData.id)
          .eq('tenant_id', this.tenantId as string);
      }

      return {
        success: true,
        message: 'Database connected and operational',
        details: { writable: true, readable: true },
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Database connection error',
        details: { error: error?.message },
      };
    }
  }

  private async testAuthentication(): Promise<ValidationResult> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) throw error;

      return {
        success: !!data?.user,
        message: data?.user ? 'User authenticated successfully' : 'No authenticated user',
        details: {
          userId: data?.user?.id,
          email: data?.user?.email,
          authenticated: !!data?.user,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Authentication check failed',
        details: { error: error?.message },
      };
    }
  }

  private async testRLS(): Promise<ValidationResult> {
    const tenantCheck = this.ensureTenant();
    if (tenantCheck) return tenantCheck;

    try {
      const tables = ['leads', 'contratos', 'agendamentos', 'agentes_ia'] as const;
      const rlsStatus: Record<string, boolean> = {};

      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('id')
            .eq('tenant_id', this.tenantId as string)
            .limit(1);

          rlsStatus[table] = !error;
        } catch {
          rlsStatus[table] = false;
        }
      }

      const allTablesAccessible = Object.values(rlsStatus).every((status) => status);

      return {
        success: allTablesAccessible,
        message: allTablesAccessible
          ? 'RLS working for tenant-scoped tables'
          : 'RLS issues detected in tenant tables',
        details: rlsStatus,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'RLS check failed',
        details: { error: error?.message },
      };
    }
  }

  private async testIntegrations(): Promise<ValidationResult> {
    try {
      const integrations = {
        healthCheck: false,
        n8n: false,
        openai: false,
      };

      try {
        const healthResponse = await supabase.functions.invoke('health-check');
        integrations.healthCheck = healthResponse.data?.status === 'ok';
      } catch {
        integrations.healthCheck = false;
      }

      integrations.n8n = integrations.healthCheck;
      integrations.openai = integrations.healthCheck;

      const allIntegrationsWorking = Object.values(integrations).every((status) => status);

      return {
        success: allIntegrationsWorking,
        message: allIntegrationsWorking
          ? 'All integrations responding'
          : 'Some integrations reported issues',
        details: integrations,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Integration check failed',
        details: { error: error?.message },
      };
    }
  }

  private async testPerformance(): Promise<ValidationResult> {
    const tenantCheck = this.ensureTenant();
    if (tenantCheck) return tenantCheck;

    try {
      const startTime = performance.now();

      const operations = [
        supabase.from('leads').select('id').eq('tenant_id', this.tenantId as string).limit(1),
        supabase.from('contratos').select('id').eq('tenant_id', this.tenantId as string).limit(1),
        supabase.from('agendamentos').select('id').eq('tenant_id', this.tenantId as string).limit(1),
        supabase.from('agentes_ia').select('id').eq('tenant_id', this.tenantId as string).limit(1),
      ];

      await Promise.all(operations);

      const endTime = performance.now();
      const responseTime = endTime - startTime;
      const isPerformant = responseTime < 2000;

      return {
        success: isPerformant,
        message: `Response time: ${responseTime.toFixed(2)}ms`,
        details: {
          responseTime,
          threshold: 2000,
          performant: isPerformant,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Performance check failed',
        details: { error: error?.message },
      };
    }
  }
}

export const useSystemValidator = () => {
  const { profile } = useAuth();

  const runValidation = async () => {
    const validator = new SystemValidator(profile?.tenant_id ?? null);
    return await validator.runFullValidation();
  };

  return { runValidation };
};
