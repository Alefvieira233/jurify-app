/**
 * 📊 METRICS CARDS - Enterprise Dashboard Subcomponent
 * 
 * Exibe cards de métricas principais do sistema.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Clock, BarChart3 } from 'lucide-react';

interface MetricsCardsProps {
  metrics: {
    leads_processed_today: number;
    conversion_rate_7d: number;
    avg_response_time: number;
    active_conversations: number;
  } | null;
  systemHealth: {
    performance_score: number;
  } | null;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, systemHealth }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      <Card className="card-monolith border-l-4 border-l-primary/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
            Leads Processados
          </CardTitle>
          <Users className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-black tracking-tighter">
            {metrics?.leads_processed_today || 0}
          </div>
          <div className="h-1 lg:w-32 bg-primary/20 mt-4 overflow-hidden">
            <div className="h-full bg-primary" style={{ width: '45%' }} />
          </div>
        </CardContent>
      </Card>

      <Card className="card-monolith border-l-4 border-l-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
            Conversão Global
          </CardTitle>
          <TrendingUp className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-black tracking-tighter">
            {metrics?.conversion_rate_7d.toFixed(1) || 0}%
          </div>
          <p className="text-[10px] font-bold text-green-500 mt-4 uppercase tracking-widest">
            +2.4% vs last period
          </p>
        </CardContent>
      </Card>

      <Card className="card-monolith border-l-4 border-l-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
            Latência Média
          </CardTitle>
          <Clock className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-black tracking-tighter">
            {metrics?.avg_response_time.toFixed(1) || 0}s
          </div>
          <p className="text-[10px] font-bold text-foreground/40 mt-4 uppercase tracking-widest">
            High Priority Sync
          </p>
        </CardContent>
      </Card>

      <Card className="card-monolith border-l-4 border-l-primary/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
            System Efficiency
          </CardTitle>
          <BarChart3 className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-black tracking-tighter">
            {systemHealth?.performance_score.toFixed(0) || 0}
          </div>
          <p className="text-[10px] font-bold text-primary mt-4 uppercase tracking-widest">
            Optimized Monolith
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
