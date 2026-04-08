import React from 'react';
import { Switch } from '@/components/ui/switch';
import { type DepartmentInfo } from './memberUtils';

interface MemberNotificationsProps {
  deptos: DepartmentInfo[];
}

const MemberNotifications = React.memo(function MemberNotifications({
  deptos,
}: MemberNotificationsProps) {
  if (deptos.length === 0) return null;

  return (
    <div className="border-t border-border/10 pt-3 space-y-2">
      <p className="text-[10px] uppercase font-bold text-muted-foreground/70">
        Notificacoes
      </p>
      {deptos.map((d) => (
        <div key={`notif-${d.nome}`} className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{d.nome}</span>
          <Switch
            checked={d.receber_notificacoes}
            disabled
            aria-label={`Notificacoes para ${d.nome}`}
          />
        </div>
      ))}
    </div>
  );
});

export default MemberNotifications;
