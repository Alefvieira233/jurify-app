/**
 * ⏱️ JURIFY RESPONSE TIME CHART
 * 
 * Visualizes AI agent response times over time.
 * Helps identify performance bottlenecks.
 * 
 * @version 1.0.0
 */

import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Zap, AlertTriangle } from 'lucide-react';

interface ResponseTimeData {
    time: string;
    avgTime: number;
    p95Time: number;
}

interface ResponseTimeChartProps {
    data: ResponseTimeData[];
    targetResponseTime?: number; // in seconds
}

export const ResponseTimeChart: React.FC<ResponseTimeChartProps> = ({
    data,
    targetResponseTime = 3,
}) => {
    // Calculate averages
    const avgResponseTime = data.length > 0
        ? data.reduce((acc, d) => acc + d.avgTime, 0) / data.length
        : 0;

    const latestP95 = data.length > 0 ? data[data.length - 1].p95Time : 0;
    const isWithinTarget = avgResponseTime <= targetResponseTime;

    return (
        <Card className="border-border bg-card shadow-premium">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-serif font-bold">Tempo de Resposta IA</CardTitle>
                            <CardDescription className="text-sm">Latência média e P95 por hora</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge
                            variant={isWithinTarget ? "default" : "destructive"}
                            className={isWithinTarget
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }
                        >
                            {isWithinTarget ? (
                                <Zap className="h-3 w-3 mr-1" />
                            ) : (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
                            {avgResponseTime.toFixed(1)}s avg
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="time"
                            fontSize={11}
                            stroke="hsl(var(--muted-foreground))"
                            tickLine={false}
                        />
                        <YAxis
                            fontSize={11}
                            stroke="hsl(var(--muted-foreground))"
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}s`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '0.25rem',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            formatter={(value: number, name: string) => [
                                `${value.toFixed(2)}s`,
                                name === 'avgTime' ? 'Média' : 'P95'
                            ]}
                        />

                        {/* Target Line */}
                        <ReferenceLine
                            y={targetResponseTime}
                            stroke="hsl(var(--accent))"
                            strokeDasharray="5 5"
                            label={{
                                value: `Meta: ${targetResponseTime}s`,
                                fill: 'hsl(var(--accent))',
                                fontSize: 10,
                                position: 'right'
                            }}
                        />

                        {/* Average Response Time */}
                        <Line
                            type="monotone"
                            dataKey="avgTime"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                            name="avgTime"
                        />

                        {/* P95 Response Time */}
                        <Line
                            type="monotone"
                            dataKey="p95Time"
                            stroke="hsl(var(--destructive))"
                            strokeWidth={1.5}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 3, fill: 'hsl(var(--destructive))' }}
                            name="p95Time"
                        />
                    </LineChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="mt-4 flex justify-center gap-6 text-xs">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-primary rounded" />
                        <span className="text-muted-foreground">Média</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-destructive rounded" style={{ maskImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, black 2px, black 4px)' }} />
                        <span className="text-muted-foreground">P95</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 bg-accent rounded" style={{ maskImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, black 2px, black 4px)' }} />
                        <span className="text-muted-foreground">Meta</span>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="mt-4 grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                    <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Média</div>
                        <div className="text-lg font-bold text-foreground font-mono">{avgResponseTime.toFixed(1)}s</div>
                    </div>
                    <div className="text-center border-x border-border/50">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">P95</div>
                        <div className="text-lg font-bold text-foreground font-mono">{latestP95.toFixed(1)}s</div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Meta</div>
                        <div className="text-lg font-bold text-accent font-mono">{targetResponseTime}s</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ResponseTimeChart;
