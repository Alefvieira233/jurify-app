import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface MemberFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  membersCount: number;
  departmentsCount: number;
}

const MemberFilters = ({
  searchTerm,
  onSearchChange,
  membersCount,
  departmentsCount,
}: MemberFiltersProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/20 p-4 rounded-[16px] border border-border/10">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail, cargo ou role..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-11 bg-background/50 border-border/20 rounded-[12px]"
        />
      </div>
      <div className="flex items-center gap-4 px-4 sm:min-w-[200px] justify-around">
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Membros</p>
          <p className="text-xl font-black">{membersCount}</p>
        </div>
        <div className="w-px h-8 bg-border/20" />
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Departamentos</p>
          <p className="text-xl font-black text-primary">{departmentsCount}</p>
        </div>
      </div>
    </div>
  );
};

export default MemberFilters;
