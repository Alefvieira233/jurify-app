/**
 * JURIFY ANALYTICS DASHBOARD
 *
 * Enterprise analytics dashboard with real-time metrics, charts, and insights.
 * Provides comprehensive view of business performance.
 *
 * Orchestrator: delegates rendering to AnalyticsFilters, AnalyticsSummaryCards, AnalyticsChartTabs.
 *
 * @version 2.0.0
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { RefreshCw } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { AnalyticsFilters, type Period } from './AnalyticsFilters';
import { AnalyticsSummaryCards, type DashboardMetrics } from './AnalyticsSummaryCards';
import { AnalyticsChartTabs, type ChartData } from './AnalyticsChartTabs';

const log = createLogger('AnalyticsDashboard');

// -- Types for DB records ---------------------------------------------------

interface LeadRecord {
    id: string;
    created_at: string | null;
    area_juridica?: string | null;
    origem?: string | null;
    status?: string | null;
}

interface ContractRecord {
    id: string;
    created_at: string | null;
    area_juridica?: string | null;
    status?: string | null;
    valor_causa?: number | null;
}

interface AiLogRecord {
    id: string;
    agent_name?: string | null;
    status?: string | null;
    created_at: string;
}

interface AnalyticsData {
    metrics: DashboardMetrics;
    chartData: ChartData;
}

// -- Helper functions (pure, outside component) -----------------------------

function generateTimeSeriesData(leads: LeadRecord[], contracts: ContractRecord[], days: number) {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0] ?? '';

        const leadsOnDay = leads.filter(l => l.created_at?.startsWith(dateStr)).length;
        const conversionsOnDay = contracts.filter(c => c.created_at?.startsWith(dateStr)).length;

        data.push({
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            leads: leadsOnDay,
            conversions: conversionsOnDay,
        });
    }
    return data;
}

function groupByField(items: Array<Record<string, string | null | undefined>>, field: string) {
    const groups: Record<string, number> = {};
    items.forEach(item => {
        const key = item[field] ?? 'Nao informado';
        groups[key] = (groups[key] ?? 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value })).slice(0, 6);
}

function generateAgentMetrics(logs: AiLogRecord[]) {
    const agents = ['Coordenador', 'Qualificador', 'Juridico', 'Comercial', 'Comunicador'];
    return agents.map(agent => {
        const agentLogs = logs.filter(l =>
            l.agent_name?.includes(agent) ||
            l.agent_name?.toLowerCase().includes(agent.toLowerCase())
        );
        const calls = agentLogs.length;
        const successCount = agentLogs.filter(l => l.status === 'success' || l.status === 'completed').length;
        const successRate = calls > 0 ? (successCount / calls) * 100 : 0;
        return { agent, calls, successRate };
    });
}

// -- Component (orchestrator) -----------------------------------------------

export const AnalyticsDashboard = () => {
    const { profile } = useAuth();
    const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('30d');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const applyLeadVisibilityFilter = useCallback((query: any) => {
        const scope = getLeadVisibilityScope();
        if (scope === 'own') {
            return query.eq('responsavel_id', profile?.id ?? '');
        } else if (scope === 'department') {
            const deptoIds = getUserDepartamentos();
            if (deptoIds.length > 0) {
                return query.in('departamento_id', deptoIds);
            }
            return query.eq('responsavel_id', profile?.id ?? '');
        }
        return query;
    }, [getLeadVisibilityScope, getUserDepartamentos, profile?.id]);

    const tenantId = profile?.tenant_id;

    const { data: analyticsData, isLoading: loading, refetch } = useQuery<AnalyticsData | null>({
        queryKey: queryKeys.analyticsDashboard.list(tenantId, selectedPeriod),
        queryFn: async () => {
            if (!tenantId) return null;

            const now = new Date();
            const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
            const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
            const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

            const [
                { data: currentLeads },
                { data: prevLeads },
                { data: currentContracts },
                { data: prevContracts },
                { data: aiLogs },
                { data: allLeads },
            ] = await Promise.all([
                applyLeadVisibilityFilter(supabase.from('leads').select('id, created_at, area_juridica, origem, status').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString())),
                applyLeadVisibilityFilter(supabase.from('leads').select('id, created_at').eq('tenant_id', tenantId).gte('created_at', prevStartDate.toISOString()).lt('created_at', startDate.toISOString())),
                supabase.from('contratos').select('id, created_at').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString()),
                supabase.from('contratos').select('id, created_at').eq('tenant_id', tenantId).gte('created_at', prevStartDate.toISOString()).lt('created_at', startDate.toISOString()),
                supabase.from('agent_ai_logs').select('id, agent_name, status, created_at').eq('tenant_id', tenantId).gte('created_at', new Date().toISOString().split('T')[0]),
                applyLeadVisibilityFilter(supabase.from('leads').select('id, created_at, area_juridica, origem, status').eq('tenant_id', tenantId)),
            ]);

            const currentLeadsCount = currentLeads?.length || 0;
            const prevLeadsCount = prevLeads?.length || 0;
            const leadsGrowth = prevLeadsCount > 0 ? ((currentLeadsCount - prevLeadsCount) / prevLeadsCount) * 100 : 0;

            const currentContractsCount = currentContracts?.length || 0;
            const prevContractsCount = prevContracts?.length || 0;
            const contractsGrowth = prevContractsCount > 0 ? ((currentContractsCount - prevContractsCount) / prevContractsCount) * 100 : 0;

            const conversionRate = currentLeadsCount > 0 ? Math.min((currentContractsCount / currentLeadsCount) * 100, 100) : 0;

            const metrics: DashboardMetrics = {
                totalLeads: allLeads?.length || 0,
                leadsThisMonth: currentLeadsCount,
                leadsGrowth,
                totalContracts: currentContractsCount,
                contractsThisMonth: currentContractsCount,
                contractsGrowth,
                conversionRate,
                avgResponseTime: 2.5,
                aiCallsToday: aiLogs?.length || 0,
                totalRevenue: currentContractsCount * 5000,
            };

            const chartData: ChartData = {
                leadsOverTime: generateTimeSeriesData(currentLeads || [], currentContracts || [], periodDays),
                leadsByArea: groupByField(allLeads || [], 'area_juridica'),
                leadsBySource: groupByField(allLeads || [], 'origem'),
                agentPerformance: generateAgentMetrics(aiLogs || []),
            };

            return { metrics, chartData };
        },
        enabled: !!tenantId,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
        meta: {
            onError: (error: unknown) => {
                log.error('Error loading analytics', error);
            },
        },
    });

    const metrics = analyticsData?.metrics ?? null;
    const chartData = analyticsData?.chartData ?? null;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnalyticsFilters
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                onRefresh={() => { void refetch(); }}
            />

            {metrics && <AnalyticsSummaryCards metrics={metrics} />}

            {chartData && <AnalyticsChartTabs chartData={chartData} />}
        </div>
    );
};

export default AnalyticsDashboard;
