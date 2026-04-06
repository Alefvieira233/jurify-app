import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, UserCheck } from 'lucide-react';

function pct(part: number, total: number): string {
  if (total === 0) return '0';
  return ((part / total) * 100).toFixed(1);
}

/* ── Departamento Grid ── */

interface DeptoEntry {
  nome: string;
  total: number;
  ganhos: number;
  valorTotal: number;
}

export const DepartamentoGrid: React.FC<{ data: DeptoEntry[] }> = ({ data }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <Building2 className="h-4 w-4 text-violet-500" />
        Metricas por Departamento
      </CardTitle>
    </CardHeader>
    <CardContent>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((d) => (
            <div key={d.nome} className="rounded-xl border border-border/40 bg-muted/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{d.nome}</span>
                <Badge variant="secondary" className="text-[10px]">{d.total} leads</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div>
                  <p className="text-muted-foreground">Ganhos</p>
                  <p className="font-semibold text-emerald-600">{d.ganhos}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Conversao</p>
                  <p className="font-semibold">{pct(d.ganhos, d.total)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Valor</p>
                  <p className="font-semibold">
                    {d.valorTotal > 0 ? `R$ ${d.valorTotal.toLocaleString('pt-BR')}` : '-'}
                  </p>
                </div>
              </div>
              <Progress value={d.total > 0 ? (d.ganhos / d.total) * 100 : 0} className="h-1.5" />
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

/* ── Responsavel Table ── */

interface RespEntry {
  nome: string;
  atribuidos: number;
  ganhos: number;
  perdidos: number;
}

export const ResponsavelTable: React.FC<{ data: RespEntry[] }> = ({ data }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-semibold flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-blue-500" />
        Metricas por Responsavel
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
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Responsavel</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Atribuidos</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Ganhos</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Perdidos</th>
                <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Conversao</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.nome} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-medium">{r.nome}</td>
                  <td className="py-2.5 px-3 text-center">{r.atribuidos}</td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                      {r.ganhos}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px]">
                      {r.perdidos}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium">{pct(r.ganhos, r.atribuidos)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);
