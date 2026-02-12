/**
 * 📊 JURIFY CONVERSION FUNNEL
 * 
 * Premium funnel visualization showing lead conversion stages.
 * Uses Recharts with custom styling for "Conservative Luxury" theme.
 * 
 * @version 1.0.0
 */

import { Fragment } from 'react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingDown, ArrowRight } from 'lucide-react';

interface FunnelStage {
    stage: string;
    value: number;
    fill: string;
    label: string;
}

interface ConversionFunnelProps {
    data: {
        novo_lead?: number;
        em_qualificacao?: number;
        proposta_enviada?: number;
        contrato_assinado?: number;
        em_atendimento?: number;
        lead_perdido?: number;
    };
}

type StageKey = 'novo_lead' | 'em_qualificacao' | 'proposta_enviada' | 'contrato_assinado';

const STAGE_CONFIG: Record<StageKey, { label: string; fill: string }> = {
    novo_lead: { label: 'Novos Leads', fill: 'hsl(217, 91%, 60%)' },
    em_qualificacao: { label: 'Em Qualificação', fill: 'hsl(45, 93%, 47%)' },
    proposta_enviada: { label: 'Proposta Enviada', fill: 'hsl(262, 83%, 58%)' },
    contrato_assinado: { label: 'Contrato Assinado', fill: 'hsl(142, 76%, 36%)' },
};

export const ConversionFunnel = ({ data }: ConversionFunnelProps) => {
    // Transform data for funnel chart (exclude lost leads and em_atendimento for funnel logic)
    const funnelData: FunnelStage[] = [
        {
            stage: 'novo_lead',
            value: data.novo_lead ?? 0,
            fill: STAGE_CONFIG.novo_lead.fill,
            label: STAGE_CONFIG.novo_lead.label,
        },
        {
            stage: 'em_qualificacao',
            value: data.em_qualificacao ?? 0,
            fill: STAGE_CONFIG.em_qualificacao.fill,
            label: STAGE_CONFIG.em_qualificacao.label,
        },
        {
            stage: 'proposta_enviada',
            value: data.proposta_enviada ?? 0,
            fill: STAGE_CONFIG.proposta_enviada.fill,
            label: STAGE_CONFIG.proposta_enviada.label,
        },
        {
            stage: 'contrato_assinado',
            value: data.contrato_assinado ?? 0,
            fill: STAGE_CONFIG.contrato_assinado.fill,
            label: STAGE_CONFIG.contrato_assinado.label,
        },
    ];

    // Calculate conversion rates between stages
    const conversionRates = funnelData.map((stage, index) => {
        if (index === 0) return 100;
        const prevValue = funnelData[index - 1]?.value ?? 0;
        if (prevValue === 0) return 0;
        return ((stage.value / prevValue) * 100).toFixed(1);
    });

    // Overall conversion rate (from first to last stage)
    const totalLeads = funnelData[0]?.value ?? 0;
    const converted = funnelData[funnelData.length - 1]?.value ?? 0;
    const overallRate = totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(1) : '0';

    return (
        <Card className="border-border bg-card shadow-premium">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                            <TrendingDown className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-serif font-bold">Funil de Conversão</CardTitle>
                            <CardDescription className="text-sm">Taxa de conversão por etapa</CardDescription>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-primary font-mono">{overallRate}%</div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider">Taxa Global</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.25rem',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            formatter={(value: number, name: string) => [value, name]}
                        />
                        <Funnel
                            dataKey="value"
                            data={funnelData}
                            isAnimationActive
                            animationDuration={800}
                        >
                            {funnelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                            <LabelList
                                position="right"
                                fill="hsl(var(--foreground))"
                                stroke="none"
                                dataKey="label"
                                fontSize={12}
                                fontWeight={600}
                            />
                            <LabelList
                                position="center"
                                fill="white"
                                stroke="none"
                                dataKey="value"
                                fontSize={14}
                                fontWeight={700}
                            />
                        </Funnel>
                    </FunnelChart>
                </ResponsiveContainer>

                {/* Conversion Rate Indicators */}
                <div className="mt-4 flex justify-between items-center px-4">
                    {funnelData.map((stage, index) => (
                        <Fragment key={stage.stage}>
                            <div className="text-center">
                                <div className="text-xs font-medium text-muted-foreground">{stage.label.split(' ')[0]}</div>
                                <div className="text-sm font-bold text-foreground">{stage.value}</div>
                            </div>
                            {index < funnelData.length - 1 && (
                                <div className="flex flex-col items-center">
                                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-[10px] text-muted-foreground">{conversionRates[index + 1]}%</span>
                                </div>
                            )}
                        </Fragment>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default ConversionFunnel;
