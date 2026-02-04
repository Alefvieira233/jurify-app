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

  const exportToCSV = async () => {
    const allowed = await hasPermission('usuarios', 'read');
    if (!allowed) {
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
      const query = supabase
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

      const rows = data as Record<string, unknown>[];
      const headers = Object.keys(rows[0] ?? {});
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(header => {
            const value = row[header];
            if (value == null) return '';
            if (typeof value === 'string') {
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            }
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
              return value.toString();
            }
            if (typeof value === 'symbol') {
              return value.description ?? '';
            }
            return '';
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
      onClick={() => void exportToCSV()}
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
