
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';

type PeriodoFiltro = 'mes' | 'trimestre' | 'ano' | 'personalizado';

interface FiltrosAvancadosProps {
  periodo: PeriodoFiltro;
  setPeriodo: (periodo: PeriodoFiltro) => void;
  areaJuridica: string;
  setAreaJuridica: (area: string) => void;
  origemLead: string;
  setOrigemLead: (origem: string) => void;
}

const FiltrosAvancados: React.FC<FiltrosAvancadosProps> = ({
  periodo,
  setPeriodo,
  areaJuridica,
  setAreaJuridica,
  origemLead,
  setOrigemLead
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filtros Avançados</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Período</label>
            <Select value={periodo} onValueChange={(value: PeriodoFiltro) => setPeriodo(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Este Mês</SelectItem>
                <SelectItem value="trimestre">Este Trimestre</SelectItem>
                <SelectItem value="ano">Este Ano</SelectItem>
                <SelectItem value="personalizado">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Área Jurídica</label>
            <Select value={areaJuridica} onValueChange={setAreaJuridica}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Áreas</SelectItem>
                <SelectItem value="Direito Trabalhista">Direito Trabalhista</SelectItem>
                <SelectItem value="Direito de Família">Direito de Família</SelectItem>
                <SelectItem value="Direito Previdenciário">Direito Previdenciário</SelectItem>
                <SelectItem value="Direito Civil">Direito Civil</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Origem dos Leads</label>
            <Select value={origemLead} onValueChange={setOrigemLead}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Origens</SelectItem>
                <SelectItem value="Facebook Ads">Facebook Ads</SelectItem>
                <SelectItem value="Google Ads">Google Ads</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="Site">Site Orgânico</SelectItem>
                <SelectItem value="Indicações">Indicações</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiltrosAvancados;
