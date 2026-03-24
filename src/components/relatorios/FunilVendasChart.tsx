
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunilVendasData {
  novo: number;
  em_contato: number;
  qualificado: number;
  proposta: number;
  negociacao: number;
  ganho: number;
  perdido: number;
}

interface FunilVendasChartProps {
  data?: FunilVendasData;
}

const FunilVendasChart: React.FC<FunilVendasChartProps> = ({ data }) => {
  if (!data) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando dados...</div>;
  }

  const chartData = [
    { etapa: 'Novo',        valor: data.novo,        cor: '#3B82F6' },
    { etapa: 'Em Contato',  valor: data.em_contato,  cor: '#06B6D4' },
    { etapa: 'Qualificado', valor: data.qualificado, cor: '#F59E0B' },
    { etapa: 'Proposta',    valor: data.proposta,    cor: '#4F46E5' },
    { etapa: 'Negociação',  valor: data.negociacao,  cor: '#7C3AED' },
    { etapa: 'Ganho',       valor: data.ganho,       cor: '#10B981' },
    { etapa: 'Perdido',     valor: data.perdido,     cor: '#E11D48' },
  ];

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="etapa" 
            angle={-45}
            textAnchor="end"
            height={80}
            fontSize={12}
          />
          <YAxis />
          <Tooltip />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.cor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default FunilVendasChart;
