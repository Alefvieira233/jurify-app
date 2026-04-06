/**
 * Jurify Subscription Manager
 *
 * Enterprise component for managing subscriptions, usage limits, and billing.
 * Integrates with Stripe for payment handling.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Brain, TrendingUp, Users, Zap, AlertTriangle } from 'lucide-react';
import { SubscriptionStatus } from './SubscriptionStatus';
import { PlanComparison } from './PlanComparison';
import { usePlans, getUsagePercentage, getUsageColor, formatLimit } from './usePlans';

export const SubscriptionManager = () => {
    const {
        subscription,
        usage,
        loading,
        upgrading,
        openingPortal,
        currentPlan,
        handleUpgrade,
        handleOpenPortal,
    } = usePlans();

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SubscriptionStatus
                currentPlan={currentPlan}
                subscription={subscription}
                openingPortal={openingPortal}
                onOpenPortal={() => { void handleOpenPortal(); }}
            />

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
                                    Clientes Cadastrados
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

            <PlanComparison
                currentPlan={currentPlan}
                upgrading={upgrading}
                onUpgrade={(plan) => { void handleUpgrade(plan); }}
            />

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
