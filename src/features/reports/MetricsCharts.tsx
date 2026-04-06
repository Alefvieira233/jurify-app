import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Globe, FileX } from 'lucide-react';

const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#e11d48', '#4f46e5', '#0891b2', '#7c3aed', '#f43f5e'];

const tooltipStyle = {
  contentStyle: {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'calc(var(--radius) - 2px)',
    fontSize: 11,
    color: 'hsl(var(--foreground))',
    boxShadow: 'var(--shadow-md)',
  },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600 },
  itemStyle: { color: 'hsl(var(--muted-foreground))' },
};

function pct(part: number, total: number): string {
  if (total === 0) return '0';
  return ((part / total) * 100).toFixed(1);
}

/* ── Funnel Chart ── */

interface FunnelEntry {
  name: string;
  value: number;
  color: string;
  id: string;
}

export const FunnelChart: React.FC<{ data: FunnelEntry[] }> = ({ data }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-indigo-500" />
        Funil de Conversao por Etapa
      </CardTitle>
    </CardHeader>
    <CardContent>
      {data.every(d => d.value === 0) ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead no funil.</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" name="Leads" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={`cell-${entry.id}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardContent>
  </Card>
);

/* ── Origem Table ── */

interface OrigemEntry {
  nome: string;
  total: number;
  ganhos: number;
}

export const OrigemTable: React.FC<{ data: OrigemEntry[] }> = ({ data }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <Globe className="h-4 w-4 text-cyan-500" />
        Performance por Origem
      </CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Origem</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Leads</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Ganhos</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Conversao</th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.nome} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-medium capitalize">{o.nome}</td>
                  <td className="py-2.5 px-3 text-center">{o.total}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                      {o.ganhos}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium">{pct(o.ganhos, o.total)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);

/* ── Arquivamento Pie ── */

interface ArquivamentoEntry {
  name: string;
  value: number;
}

export const ArquivamentoPieChart: React.FC<{ data: ArquivamentoEntry[] }> = ({ data }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <FileX className="h-4 w-4 text-rose-500" />
        Arquivamentos por Motivo
      </CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead arquivado.</p>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ResponsiveContainer width="100%" height={280} className="max-w-[340px]">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {data.map((_, idx) => (
                  <Cell key={`pie-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex-1 space-y-2 w-full">
            {data.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                />
                <span className="text-sm flex-1 truncate">{item.name}</span>
                <Badge variant="outline" className="text-[10px]">{item.value}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);
