import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ExportDataButtonProps {
  table: 'leads' | 'agendamentos' | 'contratos' | 'profiles' | 'user_roles' | 'logs_atividades';
  filename?: string;
  className?: string;
}

const ExportDataButton = ({ table, filename, className }: ExportDataButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { hasPermission, profile } = useAuth();
  const tenantId = profile?.tenant_id || null;
  const supabaseAny = supabase as typeof supabase & { from: (table: string) => any };

  const exportToCSV = async () => {
    if (!hasPermission('usuarios', 'read')) {
      toast({
        title: 'Sem permissao',
        description: 'Voce nao tem permissao para exportar dados.',
        variant: 'destructive',
      });
      return;
    }

    if (!tenantId) {
      toast({
        title: 'Tenant nao encontrado',
        description: 'Refaca o login para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const query = supabaseAny
        .from(table)
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Erro na consulta:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        toast({
          title: 'Nenhum dado encontrado',
          description: 'Nao ha dados para exportar nesta tabela.',
        });
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row =>
          headers.map(header => {
            const value = (row as any)[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename || `${table}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Exportacao concluida',
        description: `${data.length} registros exportados com sucesso.`,
      });
    } catch (error) {
      console.error('Erro na exportacao:', error);
      toast({
        title: 'Erro na exportacao',
        description: 'Nao foi possivel exportar os dados.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={exportToCSV}
      disabled={loading}
      variant="outline"
      size="sm"
      className={className}
    >
      {loading ? (
        <Download className="h-4 w-4 mr-2 animate-pulse" />
      ) : (
        <FileSpreadsheet className="h-4 w-4 mr-2" />
      )}
      {loading ? 'Exportando...' : 'Exportar CSV'}
    </Button>
  );
};

export default ExportDataButton;
