import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Briefcase, Phone } from 'lucide-react';
import { type TeamMember } from '@/hooks/useTeamMembers';
import { getRoleBadge, type DepartmentInfo } from './memberUtils';
import MemberCardHeader from './MemberCardHeader';
import MemberDepartments from './MemberDepartments';
import MemberNotifications from './MemberNotifications';

interface EditingState {
  memberId: string;
  cargo: string;
  telefone: string;
}

interface MemberCardProps {
  member: TeamMember;
  deptos: DepartmentInfo[];
  canEdit: boolean;
  editing: EditingState | null;
  isUpdating: boolean;
  onStartEdit: (member: TeamMember) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditingChange: (updater: (prev: EditingState | null) => EditingState | null) => void;
}

const MemberCard = React.memo(function MemberCard({
  member,
  deptos,
  canEdit,
  editing,
  isUpdating,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditingChange,
}: MemberCardProps) {
  const isEditing = editing?.memberId === member.id;

  return (
    <Card className="group relative rounded-[24px] border-border/10 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden">
      {/* Top accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-border/20 to-transparent" />

      <CardContent className="p-6 space-y-4">
        <MemberCardHeader
          member={member}
          canEdit={canEdit}
          isEditing={isEditing}
          isUpdating={isUpdating}
          onStartEdit={onStartEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={onCancelEdit}
        />

        {/* Name + Email */}
        <div className="space-y-1">
          <h3
            className="font-bold text-foreground text-lg leading-tight truncate"
            title={member.nome_completo ?? ''}
          >
            {member.nome_completo ?? 'Sem nome'}
          </h3>
          <p
            className="text-sm font-medium text-muted-foreground truncate"
            title={member.email}
          >
            {member.email}
          </p>
        </div>

        {/* Cargo -- inline edit */}
        <div className="flex items-center gap-2 text-sm">
          <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {isEditing && editing ? (
            <Input
              value={editing.cargo}
              onChange={(e) =>
                onEditingChange((prev) => (prev ? { ...prev, cargo: e.target.value } : prev))
              }
              placeholder="Cargo (ex: Advogado Senior)"
              className="h-8 text-sm"
              autoFocus
            />
          ) : (
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 truncate">
              {member.cargo || 'Cargo indefinido'}
            </span>
          )}
        </div>

        {/* Telefone/WhatsApp -- inline edit */}
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {isEditing && editing ? (
            <Input
              value={editing.telefone}
              onChange={(e) =>
                onEditingChange((prev) => (prev ? { ...prev, telefone: e.target.value } : prev))
              }
              placeholder="(11) 99999-9999"
              className="h-8 text-sm"
            />
          ) : (
            <span className="text-sm text-muted-foreground truncate">
              {member.telefone || 'Sem telefone'}
            </span>
          )}
        </div>

        {/* Role badge */}
        <div className="flex flex-wrap gap-1.5 min-h-[22px]">
          {getRoleBadge(member.role)}
        </div>

        <MemberDepartments deptos={deptos} />
        {canEdit && <MemberNotifications deptos={deptos} />}
      </CardContent>
    </Card>
  );
});

export default MemberCard;
