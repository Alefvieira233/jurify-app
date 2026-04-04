/**
 * JURIFY ANALYTICS DASHBOARD
 *
 * Enterprise analytics dashboard with real-time metrics, charts, and insights.
 * Provides comprehensive view of business performance.
 *
 * Migrated to React Query for proper caching, deduplication, and background refetch.
 *
 * @version 1.1.0
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useRBAC } from '@/hooks/useRBAC';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Area,
    AreaChart,
} from 'recharts';
import {
    TrendingUp,
    Users,
    FileText,
    Brain,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw,
} from 'lucide-react';
import { createLogger } from '@/lib/logger';

const log = createLogger('AnalyticsDashboard');

// Tipos para dados do banco
interface LeadRecord {
    id: string;
    created_at: string;
    area_juridica?: string | null;
    origem?: string | null;
    status?: string | null;
}

interface ContractRecord {
    id: string;
    created_at: string;
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

interface DashboardMetrics {
    totalLeads: number;
    leadsThisMonth: number;
    leadsGrowth: number;
    totalContracts: number;
    contractsThisMonth: number;
    contractsGrowth: number;
    conversionRate: number;
    avgResponseTime: number;
    aiCallsToday: number;
    totalRevenue: number;
}

interface ChartData {
    leadsOverTime: { date: string; leads: number; conversions: number }[];
    leadsByArea: { name: string; value: number }[];
    leadsBySource: { name: string; value: number }[];
    agentPerformance: { agent: string; calls: number; successRate: number }[];
}

interface AnalyticsData {
    metrics: DashboardMetrics;
    chartData: ChartData;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c43', '#a4de6c', '#d0ed57'];

// ── Helper functions (pure, outside component) ─────────────────────────────

function generateTimeSeriesData(leads: LeadRecord[], contracts: ContractRecord[], days: number) {
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0] ?? '';

        const leadsOnDay = leads.filter(l => l.created_at.startsWith(dateStr)).length;
        const conversionsOnDay = contracts.filter(c => c.created_at.startsWith(dateStr)).length;

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

// ── Component ───────────────────────────────────────────────────────────────

export const AnalyticsDashboard = () => {
    const { profile } = useAuth();
    const { getLeadVisibilityScope, getUserDepartamentos } = useRBAC();
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

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
        queryKey: ['analytics-dashboard', tenantId, selectedPeriod],
        queryFn: async () => {
            if (!tenantId) return null;

            // Calculate date ranges
            const now = new Date();
            const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
            const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
            const prevStartDate = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);

            // Fetch all data in parallel (leads filtered by visibility scope)
            const [
                { data: currentLeads },
                { data: prevLeads },
                { data: currentContracts },
                { data: prevContracts },
                { data: aiLogs },
                { data: allLeads },
            ] = await Promise.all([
                applyLeadVisibilityFilter(supabase.from('leads').select('*').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString())),
                applyLeadVisibilityFilter(supabase.from('leads').select('*').eq('tenant_id', tenantId).gte('created_at', prevStartDate.toISOString()).lt('created_at', startDate.toISOString())),
                supabase.from('contratos').select('*').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString()),
                supabase.from('contratos').select('*').eq('tenant_id', tenantId).gte('created_at', prevStartDate.toISOString()).lt('created_at', startDate.toISOString()),
                supabase.from('agent_ai_logs').select('*').eq('tenant_id', tenantId).gte('created_at', new Date().toISOString().split('T')[0]),
                applyLeadVisibilityFilter(supabase.from('leads').select('*').eq('tenant_id', tenantId)),
            ]);

            // Calculate metrics
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

            // Generate chart data
            const leadsOverTime = generateTimeSeriesData(currentLeads || [], currentContracts || [], periodDays);
            const leadsByArea = groupByField(allLeads || [], 'area_juridica');
            const leadsBySource = groupByField(allLeads || [], 'origem');
            const agentPerformance = generateAgentMetrics(aiLogs || []);

            const chartData: ChartData = {
                leadsOverTime,
                leadsByArea,
                leadsBySource,
                agentPerformance,
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

    const MetricCard = useMemo(() => {
        const Component = ({ title, value, change, icon: Icon }: { title: string; value: string | number; change?: number; icon: React.ComponentType<{ className?: string }> }) => (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{value}</div>
                    {change !== undefined && (
                        <div className={`flex items-center text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(change).toFixed(1)}% vs periodo anterior
                        </div>
                    )}
                </CardContent>
            </Card>
        );
        Component.displayName = 'MetricCard';
        return Component;
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
                    <p className="text-muted-foreground">Visao completa do seu escritorio</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted rounded-lg p-1">
                        {(['7d', '30d', '90d'] as const).map((period) => (
                            <Button
                                key={period}
                                variant={selectedPeriod === period ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setSelectedPeriod(period)}
                            >
                                {period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias'}
                            </Button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => { void refetch(); }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            {metrics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Total de Clientes"
                        value={metrics.leadsThisMonth}
                        change={metrics.leadsGrowth}
                        icon={Users}
                    />
                    <MetricCard
                        title="Contratos"
                        value={metrics.contractsThisMonth}
                        change={metrics.contractsGrowth}
                        icon={FileText}
                    />
                    <MetricCard
                        title="Taxa de Conversao"
                        value={`${metrics.conversionRate.toFixed(1)}%`}
                        icon={TrendingUp}
                    />
                    <MetricCard
                        title="Chamadas IA Hoje"
                        value={metrics.aiCallsToday}
                        icon={Brain}
                    />
                </div>
            )}

            {/* Charts */}
            {chartData && (
                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Visao Geral</TabsTrigger>
                        <TabsTrigger value="leads">Clientes</TabsTrigger>
                        <TabsTrigger value="agents">Agentes IA</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Clientes e Conversoes ao Longo do Tempo</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={chartData.leadsOverTime}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" fontSize={12} />
                                        <YAxis fontSize={12} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="leads" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} name="Leads" />
                                        <Area type="monotone" dataKey="conversions" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} name="Conversoes" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="leads" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Clientes por Area Juridica</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={chartData.leadsByArea}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {chartData.leadsByArea.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Clientes por Origem</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData.leadsBySource} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#8884d8" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="agents" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance dos Agentes de IA</CardTitle>
                                <CardDescription>Chamadas e taxa de sucesso por agente</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={chartData.agentPerformance}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="agent" fontSize={12} />
                                        <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                        <Tooltip />
                                        <Bar yAxisId="left" dataKey="calls" fill="#8884d8" name="Chamadas" />
                                        <Bar yAxisId="right" dataKey="successRate" fill="#82ca9d" name="Taxa de Sucesso (%)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
