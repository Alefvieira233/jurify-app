import React from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { Briefcase, MapPin, DollarSign, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type LeadFormData, AREAS_JURIDICAS, ORIGENS_LEAD } from '@/schemas/leadSchema';

interface TeamMember {
  id: string;
  nome_completo: string | null;
}

interface LeadJuridicalInfoProps {
  form: UseFormReturn<LeadFormData>;
  members: TeamMember[];
  formatCurrency: (value: number | undefined) => string;
  parseCurrency: (value: string) => number | undefined;
}

const LeadJuridicalInfo: React.FC<LeadJuridicalInfoProps> = ({
  form,
  members,
  formatCurrency,
  parseCurrency,
}) => {
  return (
    <div className="space-y-4 pt-4 border-t">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-amber-500" />
        Informações do Caso
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="area_juridica"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Área Jurídica *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AREAS_JURIDICAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="origem"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Origem *
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Como chegou até nós?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ORIGENS_LEAD.map((origem) => (
                    <SelectItem key={origem} value={origem}>
                      {origem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="valor_causa"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Valor da Causa
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="R$ 0,00"
                  value={formatCurrency(field.value ?? undefined)}
                  onChange={(e) => field.onChange(parseCurrency(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="responsavel_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Company & Qualification */}
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 pt-4 border-t">
        <Building2 className="h-5 w-5 text-amber-500" />
        Empresa & Qualificação
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Empresa
              </FormLabel>
              <FormControl>
                <Input placeholder="Nome da empresa (opcional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cpf_cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF/CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="000.000.000-00" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default LeadJuridicalInfo;
