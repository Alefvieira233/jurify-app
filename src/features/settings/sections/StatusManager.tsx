import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreHorizontal, Search, Users, Columns3 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const STATUSES = [
  { name: 'Recepção', color: 'bg-blue-500', description: 'Status de recepção', contacts: 21 },
  { name: 'Análise', color: 'bg-blue-600', description: 'Este lead está sendo avaliado pelo escritório', contacts: 4 },
  { name: 'Desqualificado', color: 'bg-red-500', description: 'Este lead não tem um caso que justifique atendimento', contacts: 26 },
  { name: 'Qualificado', color: 'bg-green-500', description: 'Este lead tem um caso que justifica atendimento', contacts: 3 },
  { name: 'Proposta Recusada', color: 'bg-purple-500', description: 'Este lead recebeu a proposta, mas recusou', contacts: 0 },
  { name: 'Proposta Aceita', color: 'bg-green-500', description: 'Este lead aceitou a proposta enviada', contacts: 0 },
  { name: 'Assinatura Pendente', color: 'bg-teal-500', description: 'Contrato enviado, aguardando assinatura', contacts: 0 },
  { name: 'Contrato Assinado', color: 'bg-green-600', description: 'Quando o contrato já foi assinado', contacts: 0 },
  { name: 'Reunião', color: 'bg-emerald-500', description: 'Quando o Lead deve receber uma reunião', contacts: 0 },
  { name: 'Desistência', color: 'bg-indigo-500', description: 'Sem conteúdo', contacts: 0 },
];

export default function StatusManager() {
  const [search, setSearch] = useState('');

  const filtered = STATUSES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">Status</h1>
          <p className="text-sm text-muted-foreground">Gerencie os status dos seus atendimentos e defina fluxos de trabalho.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Criar Status
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm pl-8"
          />
        </div>
        <Button variant="outline" size="sm" className="text-xs h-8 gap-1">
          <Columns3 className="h-3 w-3" /> Colunas
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Descrição</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Departamento</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Contatos</span>
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Follow-ups</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(status => (
              <tr key={status.name} className="hover:bg-muted/20 cursor-pointer">
                <td className="px-4 py-2.5">
                  <Badge className={`${status.color} text-white text-xs font-medium`}>{status.name}</Badge>
                </td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground truncate max-w-[250px]">{status.description}</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">-</td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {status.contacts}</span>
                </td>
                <td className="px-4 py-2.5 text-sm text-muted-foreground">0</td>
                <td className="px-4 py-2.5">
                  <button className="p-1 rounded hover:bg-muted">
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{filtered.length} status</p>
    </div>
  );
}
