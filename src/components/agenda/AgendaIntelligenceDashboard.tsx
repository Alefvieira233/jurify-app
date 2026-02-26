/**
 * AgendaIntelligenceDashboard — Dashboard Proativo da Agenda Jurídica
 *
 * Exibe insights, padrões, sugestões e resumo diário.
 * Integrado ao CalendarPanel para tomada de decisão rápida.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle, TrendingUp, Clock, Calendar, Lightbulb,
  Target, BarChart3, Zap, CheckCircle, XCircle,
} from 'lucide-react';
import { useAgendaIntelligence, type AgendaInsight, type DailySummary, type WeeklyPattern } from '@/hooks/useAgendaIntelligence';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const InsightCard = ({ insight }: { insight: AgendaInsight }) => {
  const getIcon = () => {
    switch (insight.type) {
      case 'conflict': return <XCircle className="h-4 w-4" />;
      case 'deadline_near': return <AlertTriangle className="h-4 w-4" />;
      case 'peak_load': return <TrendingUp className="h-4 w-4" />;
      case 'gap_detected': return <Lightbulb className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  const getColor = () => {
    switch (insight.severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 rounded-lg border text-xs ${getColor()}`}>
      <div className="flex items-start gap-2">
        {getIcon()}
        <div className="flex-1">
          <div className="font-medium">{insight.title}</div>
          <div className="text-[10px] opacity-80 mt-0.5">{insight.description}</div>
          {insight.suggestions && insight.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {insight.suggestions.map((s: string, i: number) => (
                <div key={i} className="text-[10px] opacity-70">• {s}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DailySummaryCard = ({ summary }: { summary: DailySummary }) => {
  const occupancyRate = (summary.busyHours / 10) * 100; // 10h business day

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{format(summary.date, 'EEEE', { locale: ptBR })}</span>
          <Badge variant="outline" className="text-[10px]">
            {summary.totalEvents} eventos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Occupancy */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Taxa de ocupação</span>
            <span>{occupancyRate.toFixed(0)}%</span>
          </div>
          <Progress value={occupancyRate} className="h-1.5" />
        </div>

        {/* Hours */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-green-600" />
            <span>{summary.busyHours.toFixed(1)}h ocupadas</span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-blue-600" />
            <span>{summary.freeHours.toFixed(1)}h livres</span>
          </div>
        </div>

        {/* Peak hours */}
        {summary.peakHours.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Horários de pico</div>
            <div className="flex flex-wrap gap-1">
              {summary.peakHours.map((peak: { start: string; end: string; count: number }, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {peak.start} ({peak.count})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Insights preview */}
        {summary.insights.length > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">Alertas</div>
            <div className="space-y-1">
              {summary.insights.slice(0, 2).map((insight: AgendaInsight, i: number) => (
                <div key={i} className="text-[10px] opacity-70">
                  • {insight.title}
                </div>
              ))}
              {summary.insights.length > 2 && (
                <div className="text-[10px] opacity-50">
                  +{summary.insights.length - 2} mais...
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const WeeklyPatternCard = ({ patterns }: { patterns: WeeklyPattern[] }) => {
  const busiestDay = patterns.length > 0
    ? patterns.reduce((max, day) => day.avgEvents > max.avgEvents ? day : max, patterns[0]!)
    : null;

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Padrões Semanais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Busiest day */}
        {busiestDay && (
          <div className="p-2 bg-muted rounded-lg">
            <div className="text-xs font-medium">Dia mais movimentado</div>
            <div className="text-sm font-bold text-primary">
              {dayNames[busiestDay.weekday]} ({busiestDay.avgEvents.toFixed(1)} eventos)
            </div>
            <div className="text-[10px] opacity-70">
              Pico: {busiestDay.peakHour}h
            </div>
          </div>
        )}

        {/* Weekly heatmap */}
        <div className="grid grid-cols-7 gap-1">
          {patterns.map((pattern, i) => {
            const intensity = Math.min((pattern.avgEvents / 3) * 100, 100); // Normalize to max 3 events
            const bgOpacity = intensity === 0 ? 'bg-gray-100' : 
                            intensity < 33 ? 'bg-green-200' :
                            intensity < 66 ? 'bg-yellow-200' : 'bg-red-200';
            
            return (
              <div key={i} className="text-center">
                <div className={`h-6 rounded ${bgOpacity} flex items-center justify-center text-[10px] font-medium`}>
                  {pattern.avgEvents.toFixed(0)}
                </div>
                <div className="text-[9px] opacity-60 mt-0.5">
                  {dayNames[i]}
                </div>
              </div>
            );
          })}
        </div>

        {/* Preferred duration */}
        <div className="text-xs">
          <div className="font-medium">Duração preferida</div>
          <div className="text-lg font-bold text-primary">
            {patterns.reduce((sum, p) => sum + p.preferredDuration, 0) / patterns.length | 0}min
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export const AgendaIntelligenceDashboard = () => {
  const {
    weeklyPatterns,
    insights,
    dailySummaries,
  } = useAgendaIntelligence();

  // Quick stats
  const stats = useMemo(() => {
    const totalEvents = dailySummaries.reduce((sum, d) => sum + d.totalEvents, 0);
    const totalBusyHours = dailySummaries.reduce((sum, d) => sum + d.busyHours, 0);
    const avgOccupancy = dailySummaries.length > 0 
      ? (totalBusyHours / (dailySummaries.length * 10)) * 100 
      : 0;
    const criticalInsights = insights.filter(i => i.severity === 'high').length;

    return {
      totalEvents,
      totalBusyHours,
      avgOccupancy,
      criticalInsights,
    };
  }, [dailySummaries, insights]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inteligência da Agenda</h2>
          <p className="text-sm text-muted-foreground">
            Insights e sugestões para otimizar seu tempo
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Target className="h-3.5 w-3.5 mr-1.5" />
          Ver Relatório Completo
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Calendar className="h-4 w-4 mx-auto text-primary mb-1" />
            <div className="text-lg font-bold">{stats.totalEvents}</div>
            <div className="text-xs text-muted-foreground">Eventos esta semana</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-4 w-4 mx-auto text-green-600 mb-1" />
            <div className="text-lg font-bold">{stats.totalBusyHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground">Horas ocupadas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <BarChart3 className="h-4 w-4 mx-auto text-blue-600 mb-1" />
            <div className="text-lg font-bold">{stats.avgOccupancy.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Taxa de ocupação</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-4 w-4 mx-auto text-red-600 mb-1" />
            <div className="text-lg font-bold">{stats.criticalInsights}</div>
            <div className="text-xs text-muted-foreground">Alertas críticos</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* Daily Summaries */}
        <div className="col-span-2 space-y-3">
          <h3 className="text-sm font-semibold">Resumo Diário</h3>
          <div className="grid grid-cols-2 gap-3">
            {dailySummaries.slice(0, 4).map((summary, i) => (
              <DailySummaryCard key={i} summary={summary} />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3">
          {/* Weekly Patterns */}
          <WeeklyPatternCard patterns={weeklyPatterns} />

          {/* Top Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Insights Principais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {insights.slice(0, 4).map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
              {insights.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  Nenhum insight detectado
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button size="sm" className="w-full justify-start" variant="outline">
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Encontrar melhor horário
              </Button>
              <Button size="sm" className="w-full justify-start" variant="outline">
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Otimizar agenda
              </Button>
              <Button size="sm" className="w-full justify-start" variant="outline">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                Ver tendências
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgendaIntelligenceDashboard;
