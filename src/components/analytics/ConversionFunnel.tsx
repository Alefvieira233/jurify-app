
import { useMemo } from 'react';
import { TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface ConversionFunnelProps {
  data: {
    novo_lead?:         number;
    em_qualificacao?:   number;
    proposta_enviada?:  number;
    contrato_assinado?: number;
    em_atendimento?:    number;
    lead_perdido?:      number;
  };
}

type StageKey = 'novo_lead' | 'em_qualificacao' | 'proposta_enviada' | 'contrato_assinado';

const STAGE_CONFIG: Record<StageKey, { label: string; hex: string; textColor: string }> = {
  novo_lead:         { label: 'Captação',     hex: '#2563eb', textColor: '#1d4ed8' },
  em_qualificacao:   { label: 'Qualificação', hex: '#d97706', textColor: '#b45309' },
  proposta_enviada:  { label: 'Proposta',     hex: '#4f46e5', textColor: '#4338ca' },
  contrato_assinado: { label: 'Contrato',     hex: '#059669', textColor: '#047857' },
};

const STAGE_ORDER: StageKey[] = [
  'novo_lead', 'em_qualificacao', 'proposta_enviada', 'contrato_assinado',
];

/* Rate coloring: green ≥50 · amber 30–49 · rose <30 */
function rateHex(r: number)   { return r >= 50 ? '#059669' : r >= 30 ? '#d97706' : '#e11d48'; }
function rateBg(r: number)    { return r >= 50 ? 'rgba(5,150,105,0.10)' : r >= 30 ? 'rgba(217,119,6,0.10)' : 'rgba(225,29,72,0.10)'; }

export const ConversionFunnel = ({ data }: ConversionFunnelProps) => {
  const stages = useMemo(() =>
    STAGE_ORDER.map(key => ({
      key,
      ...STAGE_CONFIG[key],
      value: data[key] ?? 0,
    })),
  [data]);

  const topValue   = stages[0]?.value ?? 0;
  const converted  = stages[stages.length - 1]?.value ?? 0;
  const overallPct = topValue > 0 ? (converted / topValue) * 100 : 0;
  const lostLeads  = data.lead_perdido ?? 0;

  /* Step conversion rates */
  const stepRates = stages.map((s, i) => {
    if (i === 0) return 100;
    const prev = stages[i - 1]?.value ?? 0;
    return prev > 0 ? Math.round((s.value / prev) * 100) : 0;
  });

  return (
    <Card className="border-border bg-card shadow-sm">

      {/* ── Header ── */}
      <CardHeader className="px-5 py-3 border-b border-border/60">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground leading-tight">Funil de Conversão</p>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">
                {topValue} leads captados · {converted} convertidos
              </p>
            </div>
          </div>

          {/* Overall rate */}
          <div className="flex-shrink-0 text-right">
            <p
              className="text-xl font-bold tabular-nums leading-tight"
              style={{ color: rateHex(overallPct) }}
            >
              {overallPct.toFixed(1)}%
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mt-0.5">
              taxa global
            </p>
          </div>
        </div>
      </CardHeader>

      {/* ── Funnel bars ── */}
      <CardContent className="px-5 pb-5 pt-4">
        <div className="space-y-0">
          {stages.map((stage, i) => {
            const widthPct = topValue > 0 ? Math.max((stage.value / topValue) * 100, 3) : 3;
            const pctOfTop = topValue > 0 ? ((stage.value / topValue) * 100).toFixed(0) : '0';
            const stepRate = stepRates[i] ?? 0;
            const dropped  = i > 0 ? ((stages[i - 1]?.value ?? 0) - stage.value) : 0;

            return (
              <div key={stage.key}>

                {/* ── Drop connector between stages ── */}
                {i > 0 && (
                  <div className="flex items-center gap-2 my-1.5 ml-[9px]">
                    <div className="w-px h-4 bg-border" />
                    <div
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums"
                      style={{ color: rateHex(stepRate), background: rateBg(stepRate) }}
                    >
                      {stepRate}% avançaram
                    </div>
                    {dropped > 0 && (
                      <span className="text-[10px] text-muted-foreground/50">
                        −{dropped} saíram
                      </span>
                    )}
                  </div>
                )}

                {/* ── Bar row ── */}
                <div className="flex items-center gap-3">

                  {/* Color dot */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: stage.hex }}
                  />

                  {/* Stage label */}
                  <p className="w-[88px] flex-shrink-0 text-xs font-medium text-muted-foreground truncate">
                    {stage.label}
                  </p>

                  {/* Bar track */}
                  <div className="flex-1 h-6 bg-muted/40 rounded-md overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md flex items-center transition-all duration-700"
                      style={{ width: `${widthPct}%`, background: stage.hex + 'cc' }}
                    >
                      {stage.value > 0 && widthPct > 12 && (
                        <span className="text-white text-[10px] font-bold px-2 tabular-nums">
                          {stage.value}
                        </span>
                      )}
                    </div>
                    {/* Value outside bar if bar is too narrow */}
                    {(widthPct <= 12 && stage.value > 0) && (
                      <span
                        className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums"
                        style={{ color: stage.textColor }}
                      >
                        {stage.value}
                      </span>
                    )}
                  </div>

                  {/* Percentage of top */}
                  <div className="w-10 text-right flex-shrink-0">
                    <span
                      className="text-xs font-bold tabular-nums"
                      style={{ color: stage.textColor }}
                    >
                      {pctOfTop}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Summary pills ── */}
        <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5">
          {stages.map(s => (
            <div
              key={s.key}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{ background: s.hex + '10' }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.hex }} />
              <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: s.textColor }}>
                {data[s.key] ?? 0}
              </span>
            </div>
          ))}

          {lostLeads > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">Perdidos</span>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {lostLeads}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ConversionFunnel;
