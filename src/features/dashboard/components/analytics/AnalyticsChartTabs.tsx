/**
 * AnalyticsChartTabs -- Tabbed chart sections (overview, leads, agents).
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c43', '#a4de6c', '#d0ed57'];

interface ChartData {
  leadsOverTime: { date: string; leads: number; conversions: number }[];
  leadsByArea: { name: string; value: number }[];
  leadsBySource: { name: string; value: number }[];
  agentPerformance: { agent: string; calls: number; successRate: number }[];
}

interface AnalyticsChartTabsProps {
  chartData: ChartData;
}

const AnalyticsChartTabs = React.memo(({ chartData }: AnalyticsChartTabsProps) => (
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
));

AnalyticsChartTabs.displayName = 'AnalyticsChartTabs';

export { AnalyticsChartTabs };
export type { AnalyticsChartTabsProps, ChartData };
