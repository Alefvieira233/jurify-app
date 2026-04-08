import React from 'react';
import { Badge } from '@/components/ui/badge';
import { type DepartmentInfo } from './memberUtils';

interface MemberDepartmentsProps {
  deptos: DepartmentInfo[];
}

const MemberDepartments = React.memo(function MemberDepartments({
  deptos,
}: MemberDepartmentsProps) {
  if (deptos.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase font-bold text-muted-foreground/70">
        Departamentos
      </p>
      <div className="flex flex-wrap gap-1.5">
        {deptos.map((d) => (
          <Badge
            key={d.nome}
            variant="outline"
            className="text-[10px] font-semibold"
            style={{
              borderColor: d.cor,
              color: d.cor,
              backgroundColor: `${d.cor}10`,
            }}
          >
            {d.nome}
          </Badge>
        ))}
      </div>
    </div>
  );
});

export default MemberDepartments;
