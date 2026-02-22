
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OrigemLeadsChartProps {
  data?: Record<string, number>;
}

const OrigemLeadsChart: React.FC<OrigemLeadsChartProps> = ({ data }) => {
  if (!data) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando dados...</div>;
  }

  const chartData = Object.entries(data).map(([origem, valor]) => ({
    origem,
    valor
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="origem" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis />
          <Tooltip />
          <Bar 
            dataKey="valor" 
            fill="#10B981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OrigemLeadsChart;
