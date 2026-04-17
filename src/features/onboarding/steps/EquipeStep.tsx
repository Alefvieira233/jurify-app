import { useEffect, useRef, useState } from 'react';
import { Users, ArrowRight, SkipForward, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';
import {
  TeamInvitesSubmitSchema,
  TEAM_INVITE_MAX,
  type TeamInviteDraftRow,
  type TeamInviteRole,
} from '@/schemas/domain';

const log = createLogger('EquipeStep');

const ROLE_LABELS: Record<TeamInviteRole, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  member: 'Membro',
};

interface EquipeStepProps {
  onNext: () => void;
  onSkip: () => void;
}

const EquipeStep = ({ onNext, onSkip }: EquipeStepProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<TeamInviteDraftRow[]>([
    { email: '', role: 'member' },
  ]);
  const [errors, setErrors] = useState<Record<number, string | undefined>>({});
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const addRow = () => {
    if (rows.length >= TEAM_INVITE_MAX) return;
    setRows((r) => [...r, { email: '', role: 'member' }]);
  };

  const removeRow = (idx: number) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((_, i) => i !== idx)));
  };

  const updateRow = (idx: number, patch: Partial<TeamInviteDraftRow>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
    setErrors((prev) => ({ ...prev, [idx]: undefined }));
  };

  const handleSubmit = async () => {
    if (!profile?.tenant_id || !user) return;
    const parsed = TeamInvitesSubmitSchema.safeParse(rows);

    if (!parsed.success) {
      const fieldErrors: Record<number, string> = {};
      for (const issue of parsed.error.issues) {
        const idx = issue.path[0];
        if (typeof idx === 'number') fieldErrors[idx] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // No non-empty rows → treat as skip
    if (parsed.data.length === 0) {
      onSkip();
      return;
    }

    setSubmitting(true);
    try {
      const inviterName = profile.nome_completo || user.email || 'Um administrador';
      const { data: tenant } = await supabase
        .from('tenants')
        .select('nome')
        .eq('id', profile.tenant_id)
        .maybeSingle();
      const firmName = tenant?.nome ?? 'Jurify';

      const inviteRows = parsed.data.map((r) => ({
        tenant_id: profile.tenant_id,
        email: r.email,
        role: r.role,
        invited_by: user.id,
      }));

      const { data: inserted, error } = await supabase
        .from('team_invites')
        .upsert(inviteRows as never, { onConflict: 'tenant_id,email' })
        .select('id, email, role, token');

      if (error) throw error;

      // Fire-and-forget emails — failures shouldn't block onboarding.
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://jurify-app.vercel.app';
      await Promise.allSettled(
        (inserted ?? []).map((row) =>
          supabase.functions.invoke('send-email', {
            body: {
              to: row.email,
              template: 'team-invitation',
              data: {
                invite_url: `${origin}/convite?token=${row.token}`,
                inviter_name: inviterName,
                firm_name: firmName,
                role_label: ROLE_LABELS[row.role as TeamInviteRole] ?? 'membro',
              },
            },
          }),
        ),
      );

      toast({
        title: 'Convites enviados',
        description: `${parsed.data.length} convite(s) criado(s).`,
      });
      onNext();
    } catch (err) {
      log.error('invite create failed', err);
      toast({
        title: 'Erro ao enviar convites',
        description: 'Voce pode tentar novamente ou pular este passo.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <Users className="w-7 h-7 text-blue-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Convide sua equipe
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Convide ate {TEAM_INVITE_MAX} pessoas agora. Voce pode adicionar mais depois.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => {
          const emailId = `invite-email-${idx}`;
          const errId = `invite-error-${idx}`;
          const err = errors[idx];
          return (
            <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex-1 w-full">
                <Label htmlFor={emailId} className="sr-only">
                  Email do convidado {idx + 1}
                </Label>
                <Input
                  id={emailId}
                  type="email"
                  placeholder="email@escritorio.com"
                  value={row.email}
                  onChange={(e) => updateRow(idx, { email: e.target.value })}
                  aria-invalid={!!err}
                  aria-describedby={err ? errId : undefined}
                  ref={idx === 0 ? firstInputRef : undefined}
                />
                {err ? (
                  <p id={errId} className="text-xs text-destructive mt-1">
                    {err}
                  </p>
                ) : null}
              </div>
              <Select
                value={row.role}
                onValueChange={(v) => updateRow(idx, { role: v as TeamInviteRole })}
              >
                <SelectTrigger className="w-full sm:w-[140px]" aria-label="Papel do convidado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                  <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                  <SelectItem value="member">{ROLE_LABELS.member}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-9 w-9"
                onClick={() => removeRow(idx)}
                disabled={rows.length <= 1}
                aria-label="Remover convite"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          );
        })}

        {rows.length < TEAM_INVITE_MAX && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground gap-1"
            onClick={addRow}
          >
            <Plus className="w-4 h-4" />
            Adicionar convite
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 mt-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1"
          onClick={onSkip}
        >
          <SkipForward className="w-4 h-4" />
          Pular por agora
        </Button>
        <Button
          type="button"
          size="lg"
          className="gap-2 font-semibold"
          onClick={() => void handleSubmit()}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Enviar convites
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default EquipeStep;
