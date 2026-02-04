/**
 * 💳 JURIFY SUBSCRIPTION MANAGER
 * 
 * Enterprise component for managing subscriptions, usage limits, and billing.
 * Integrates with Stripe for payment handling.
 * 
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
    CreditCard,
    Zap,
    Users,
    Brain,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    ArrowUpRight,
    RefreshCw,
} from 'lucide-react';

interface Subscription {
    id: string;
    plan_id: string;
    status: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
}

interface UsageLimits {
    ai_calls: { used: number; limit: number };
    leads: { used: number; limit: number };
    users: { used: number; limit: number };
    storage_mb: { used: number; limit: number };
}

const PLAN_LIMITS: Record<string, UsageLimits> = {
    free: {
        ai_calls: { used: 0, limit: 50 },
        leads: { used: 0, limit: 100 },
        users: { used: 0, limit: 2 },
        storage_mb: { used: 0, limit: 100 },
    },
    pro: {
        ai_calls: { used: 0, limit: 500 },
        leads: { used: 0, limit: 1000 },
        users: { used: 0, limit: 10 },
        storage_mb: { used: 0, limit: 1000 },
    },
    enterprise: {
        ai_calls: { used: 0, limit: -1 }, // Unlimited
        leads: { used: 0, limit: -1 },
        users: { used: 0, limit: -1 },
        storage_mb: { used: 0, limit: 10000 },
    },
};

export const SubscriptionManager = () => {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState<UsageLimits | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState(false);

    const currentPlan = subscription?.plan_id || profile?.subscription_tier || 'free';

    const loadSubscriptionData = useCallback(async () => {
        if (!profile?.id) return;

        try {
            setLoading(true);

            // Load subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', profile.id)
                .single();

            if (subData) {
                setSubscription(subData);
            }

            // Calculate usage
            const tenantId = profile.tenant_id;
            if (!tenantId) return;

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [
                { count: aiCalls },
                { count: leadsCount },
                { count: usersCount },
            ] = await Promise.all([
                supabase
                    .from('agent_ai_logs')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId)
                    .gte('created_at', thirtyDaysAgo.toISOString()),
                supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId),
                supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('tenant_id', tenantId),
            ]);

            const planLimits = PLAN_LIMITS[currentPlan] ?? PLAN_LIMITS.free;
            setUsage({
                ai_calls: { ...planLimits.ai_calls, used: aiCalls || 0 },
                leads: { ...planLimits.leads, used: leadsCount || 0 },
                users: { ...planLimits.users, used: usersCount || 0 },
                storage_mb: { ...planLimits.storage_mb, used: 50 }, // Placeholder
            });

        } catch (error) {
            console.error('Error loading subscription:', error);
        } finally {
            setLoading(false);
        }
    }, [profile, currentPlan]);

    useEffect(() => {
        void loadSubscriptionData();
    }, [loadSubscriptionData]);

    const handleUpgrade = async (newPlan: string) => {
        setUpgrading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { planId: newPlan },
            });

            if (error) throw error;

            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            toast({
                title: 'Erro',
                description: 'Não foi possível iniciar o upgrade. Tente novamente.',
                variant: 'destructive',
            });
        } finally {
            setUpgrading(false);
        }
    };

    const getUsagePercentage = (used: number, limit: number): number => {
        if (limit === -1) return 0; // Unlimited
        return Math.min((used / limit) * 100, 100);
    };

    const getUsageColor = (percentage: number): string => {
        if (percentage >= 90) return 'text-red-600';
        if (percentage >= 70) return 'text-yellow-600';
        return 'text-green-600';
    };

    const formatLimit = (limit: number): string => {
        return limit === -1 ? 'Ilimitado' : limit.toLocaleString('pt-BR');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Plan */}
            <Card className="border-2 border-primary/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" />
                                Seu Plano Atual
                            </CardTitle>
                            <CardDescription>
                                Gerenciamento de assinatura e uso
                            </CardDescription>
                        </div>
                        <Badge variant={currentPlan === 'enterprise' ? 'default' : 'secondary'} className="text-lg px-4 py-1">
                            {currentPlan.toUpperCase()}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {subscription && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Status: {subscription.status}
                            </span>
                            {subscription.current_period_end && (
                                <span>
                                    Próxima cobrança: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                            {subscription.cancel_at_period_end && (
                                <Badge variant="destructive">Cancela ao fim do período</Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Usage Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {usage && (
                    <>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Brain className="h-4 w-4 text-purple-500" />
                                    Chamadas de IA
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{usage.ai_calls.used.toLocaleString('pt-BR')}</span>
                                        <span className={getUsageColor(getUsagePercentage(usage.ai_calls.used, usage.ai_calls.limit))}>
                                            / {formatLimit(usage.ai_calls.limit)}
                                        </span>
                                    </div>
                                    <Progress value={getUsagePercentage(usage.ai_calls.used, usage.ai_calls.limit)} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-blue-500" />
                                    Leads Cadastrados
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{usage.leads.used.toLocaleString('pt-BR')}</span>
                                        <span className={getUsageColor(getUsagePercentage(usage.leads.used, usage.leads.limit))}>
                                            / {formatLimit(usage.leads.limit)}
                                        </span>
                                    </div>
                                    <Progress value={getUsagePercentage(usage.leads.used, usage.leads.limit)} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Users className="h-4 w-4 text-green-500" />
                                    Usuários
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{usage.users.used}</span>
                                        <span className={getUsageColor(getUsagePercentage(usage.users.used, usage.users.limit))}>
                                            / {formatLimit(usage.users.limit)}
                                        </span>
                                    </div>
                                    <Progress value={getUsagePercentage(usage.users.used, usage.users.limit)} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    Armazenamento
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{usage.storage_mb.used} MB</span>
                                        <span className={getUsageColor(getUsagePercentage(usage.storage_mb.used, usage.storage_mb.limit))}>
                                            / {formatLimit(usage.storage_mb.limit)} MB
                                        </span>
                                    </div>
                                    <Progress value={getUsagePercentage(usage.storage_mb.used, usage.storage_mb.limit)} />
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Upgrade Options */}
            {currentPlan !== 'enterprise' && (
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpRight className="h-5 w-5 text-purple-600" />
                            Upgrade seu Plano
                        </CardTitle>
                        <CardDescription>
                            Desbloqueie mais recursos e escale seu escritório
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentPlan === 'free' && (
                                <Card className="border-2 hover:border-blue-500 transition-colors">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Pro</CardTitle>
                                        <CardDescription>R$ 297/mês</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="text-sm space-y-1 mb-4">
                                            <li>✅ 500 chamadas IA/mês</li>
                                            <li>✅ 1.000 leads</li>
                                            <li>✅ 10 usuários</li>
                                            <li>✅ Suporte prioritário</li>
                                        </ul>
                                        <Button
                                            onClick={() => { void handleUpgrade('pro'); }}
                                            disabled={upgrading}
                                            className="w-full"
                                        >
                                            {upgrading ? 'Processando...' : 'Upgrade para Pro'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                            <Card className="border-2 border-purple-500 hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">Enterprise</CardTitle>
                                        <Badge>RECOMENDADO</Badge>
                                    </div>
                                    <CardDescription>Sob consulta</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ul className="text-sm space-y-1 mb-4">
                                        <li>✅ Chamadas IA ilimitadas</li>
                                        <li>✅ Leads ilimitados</li>
                                        <li>✅ Usuários ilimitados</li>
                                        <li>✅ SLA garantido</li>
                                        <li>✅ Suporte dedicado</li>
                                    </ul>
                                    <Button
                                        onClick={() => { void handleUpgrade('enterprise'); }}
                                        disabled={upgrading}
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                        {upgrading ? 'Processando...' : 'Falar com Vendas'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Usage Warning */}
            {usage && (
                (getUsagePercentage(usage.ai_calls.used, usage.ai_calls.limit) > 80 ||
                    getUsagePercentage(usage.leads.used, usage.leads.limit) > 80) && (
                    <Card className="bg-yellow-50 border-yellow-200">
                        <CardContent className="flex items-center gap-4 pt-6">
                            <AlertTriangle className="h-8 w-8 text-yellow-600" />
                            <div>
                                <p className="font-medium text-yellow-800">Limite de uso próximo</p>
                                <p className="text-sm text-yellow-700">
                                    Você está se aproximando do limite do seu plano. Considere fazer upgrade para continuar usando sem interrupções.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )
            )}
        </div>
    );
};

export default SubscriptionManager;
