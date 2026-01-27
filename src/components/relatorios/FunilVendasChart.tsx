
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface FunilVendasData {
  novo_lead: number;
  em_qualificacao: number;
  proposta_enviada: number;
  contrato_assinado: number;
  em_atendimento: number;
  lead_perdido: number;
}

interface FunilVendasChartProps {
  data?: FunilVendasData;
}

const FunilVendasChart: React.FC<FunilVendasChartProps> = ({ data }) => {
  if (!data) {
    return <div className="h-64 flex items-center justify-center text-gray-500">Carregando dados...</div>;
  }

  const chartData = [
    { etapa: 'Novos Leads', valor: data.novo_lead, cor: '#3B82F6' },
    { etapa: 'Em Qualificação', valor: data.em_qualificacao, cor: '#10B981' },
    { etapa: 'Proposta Enviada', valor: data.proposta_enviada, cor: '#F59E0B' },
    { etapa: 'Contrato Assinado', valor: data.contrato_assinado, cor: '#EF4444' },
    { etapa: 'Em Atendimento', valor: data.em_atendimento, cor: '#8B5CF6' },
    { etapa: 'Leads Perdidos', valor: data.lead_perdido, cor: '#6B7280' }
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
