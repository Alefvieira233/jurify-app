/**
 * 💰 JURIFY REVENUE CARD
 * 
 * Premium MRR/ARR visualization card with Stripe integration.
 * Shows current revenue, growth, and projections.
 * 
 * @version 1.0.0
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { motion } from 'framer-motion';

interface RevenueCardProps {
    currentMRR: number;
    previousMRR: number;
    contractsThisMonth: number;
    avgTicket?: number;
    targetMRR?: number;
}

export const RevenueCard: React.FC<RevenueCardProps> = ({
    currentMRR,
    previousMRR,
    contractsThisMonth,
    avgTicket = 5000,
    targetMRR = 50000,
}) => {
    const growth = previousMRR > 0 ? ((currentMRR - previousMRR) / previousMRR) * 100 : 0;
    const isPositive = growth >= 0;
    const progressToTarget = targetMRR > 0 ? (currentMRR / targetMRR) * 100 : 0;
    const arr = currentMRR * 12;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
        >
            <Card className="relative overflow-hidden border-border bg-gradient-to-br from-card to-card/95 shadow-premium group">
                {/* Premium Gold Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent/80 to-accent/50" />

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              hsl(var(--accent)) 10px,
              hsl(var(--accent)) 11px
            )`
                    }} />
                </div>

                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Receita Recorrente (MRR)
                    </CardTitle>
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent/70 rounded-xl blur-md opacity-40" />
                        <div className="relative p-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl">
                            <DollarSign className="h-5 w-5 text-accent" strokeWidth={2.5} />
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="relative">
                    {/* Main MRR Value */}
                    <div className="mb-4">
                        <div className="text-4xl font-bold text-foreground font-mono tracking-tight">
                            {formatCurrency(currentMRR)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge
                                className={`${isPositive
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                    : 'bg-red-100 text-red-800 border-red-200'
                                    } border font-bold px-2 py-0.5`}
                            >
                                {isPositive ? (
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                ) : (
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                )}
                                {isPositive ? '+' : ''}{growth.toFixed(1)}%
                            </Badge>
                            <span className="text-xs text-muted-foreground">vs mês anterior</span>
                        </div>
                    </div>

                    {/* ARR Projection */}
                    <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
                        <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">ARR Projetado</div>
                            <div className="text-lg font-bold text-foreground font-mono">{formatCurrency(arr)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Ticket Médio</div>
                            <div className="text-lg font-bold text-foreground font-mono">{formatCurrency(avgTicket)}</div>
                        </div>
                    </div>

                    {/* Target Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                                <Target className="h-3 w-3 text-accent" />
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                                    Meta Mensal
                                </span>
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                                {formatCurrency(currentMRR)} / {formatCurrency(targetMRR)}
                            </span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/70 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progressToTarget, 100)}%` }}
                                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                            />
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-bold text-accent">{progressToTarget.toFixed(0)}%</span>
                        </div>
                    </div>

                    {/* Contracts Badge */}
                    <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Contratos este mês</span>
                            <Badge variant="secondary" className="font-mono font-bold">
                                {contractsThisMonth}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export default RevenueCard;
