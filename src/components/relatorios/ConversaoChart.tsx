import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConversaoChartProps {
  periodo: string;
}

const ConversaoChart: React.FC<ConversaoChartProps> = ({ periodo }) => {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id || null;

  const { data: dadosConversao } = useQuery({
    queryKey: ['dados-conversao', tenantId, periodo],
    queryFn: async () => {
      if (!tenantId) return [] as Array<{ semana: string; taxa: number }>;

      const semanas: Array<{ semana: string; taxa: number }> = [];
      for (let i = 4; i >= 0; i--) {
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - (i * 7));

        const dataFim = new Date(dataInicio);
        dataFim.setDate(dataFim.getDate() + 6);

        const { data: leads, error: leadsError } = await supabase
          .from('leads')
          .select('id')
          .eq('tenant_id', tenantId)
          .gte('created_at', dataInicio.toISOString())
          .lte('created_at', dataFim.toISOString());

        if (leadsError) throw leadsError;

        const { data: contratos, error: contratosError } = await supabase
          .from('contratos')
          .select('id, status')
          .eq('tenant_id', tenantId)
          .gte('created_at', dataInicio.toISOString())
          .lte('created_at', dataFim.toISOString());

        if (contratosError) throw contratosError;

        const totalLeads = leads?.length || 0;
        const contratosAssinados = contratos?.filter(c => c?.status === 'assinado').length || 0;
        const taxaConversao = totalLeads > 0 ? (contratosAssinados / totalLeads) * 100 : 0;

        semanas.push({
          semana: `Sem ${5 - i}`,
          taxa: Math.round(taxaConversao * 10) / 10
        });
      }

      return semanas;
    }
  });

  if (!dadosConversao || !Array.isArray(dadosConversao)) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground">Carregando dados...</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dadosConversao} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="semana" />
          <YAxis
            label={{ value: 'Taxa (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            formatter={(value) => [`${Number(value)}%`, 'Taxa de Conversao']}
          />
          <Line
            type="monotone"
            dataKey="taxa"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ r: 6 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ConversaoChart;
