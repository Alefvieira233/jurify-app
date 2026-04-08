import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Pencil } from 'lucide-react';
import { type TeamMember } from '@/hooks/useTeamMembers';
import { getAvatarHex, getInitials } from '@/utils/formatting';

interface MemberCardHeaderProps {
  member: TeamMember;
  canEdit: boolean;
  isEditing: boolean;
  isUpdating: boolean;
  onStartEdit: (member: TeamMember) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}

const MemberCardHeader = React.memo(function MemberCardHeader({
  member,
  canEdit,
  isEditing,
  isUpdating,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
}: MemberCardHeaderProps) {
  const avatarColor = getAvatarHex(member.nome_completo ?? '');
  const initials = getInitials(member.nome_completo ?? '');

  return (
    <div className="flex items-start justify-between">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md border-2 border-background"
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      {canEdit && !isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={() => onStartEdit(member)}
          title="Editar membro"
          aria-label="Editar membro"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {isEditing && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
            onClick={onSaveEdit}
            disabled={isUpdating}
            title="Salvar"
            aria-label="Salvar edicao"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onCancelEdit}
            title="Cancelar"
            aria-label="Cancelar edicao"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
});

export default MemberCardHeader;
