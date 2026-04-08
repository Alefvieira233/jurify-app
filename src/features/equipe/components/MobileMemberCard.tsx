import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { MobileCard } from '@/components/ui/MobileCard';
import { type TeamMember } from '@/hooks/useTeamMembers';
import { getRoleBadge, type DepartmentInfo } from './memberUtils';

interface MobileMemberCardProps {
  member: TeamMember;
  deptos: DepartmentInfo[];
  canEdit: boolean;
  onStartEdit: (member: TeamMember) => void;
}

const MobileMemberCard = React.memo(function MobileMemberCard({
  member,
  deptos,
  canEdit,
  onStartEdit,
}: MobileMemberCardProps) {
  return (
    <MobileCard
      title={member.nome_completo ?? 'Sem nome'}
      subtitle={member.email}
      badge={getRoleBadge(member.role)}
      details={[
        { label: 'Cargo', value: member.cargo || 'Indefinido' },
        { label: 'Telefone', value: member.telefone || 'Sem telefone' },
        ...(deptos.length > 0
          ? [
              {
                label: 'Departamentos',
                value: (
                  <div className="flex flex-wrap gap-1 justify-end">
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
                ),
              },
            ]
          : []),
      ]}
      actions={
        canEdit ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onStartEdit(member)}
          >
            <Pencil className="w-4 h-4 mr-2" /> Editar
          </Button>
        ) : undefined
      }
    />
  );
});

export default MobileMemberCard;
