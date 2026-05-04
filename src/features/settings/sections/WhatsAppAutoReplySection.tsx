import { useEffect, useState } from 'react';
import { Save, Sparkles, Moon, Clock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  useWhatsAppAutoReplies,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHourRule,
} from '@/hooks/useWhatsAppAutoReply';

const DAY_LABELS: Record<string, string> = {
  sun: 'Dom', mon: 'Seg', tue: 'Ter', wed: 'Qua', thu: 'Qui', fri: 'Sex', sat: 'Sáb',
};
const ALL_DAYS: BusinessHourRule['day'][] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface DraftState {
  greeting: { enabled: boolean; message: string };
  away: { enabled: boolean; message: string; business_hours: BusinessHourRule[] };
}

const DEFAULT_DRAFT: DraftState = {
  greeting: { enabled: true, message: 'Olá! 👋 Recebemos sua mensagem e vamos te responder em breve. Atendemos de segunda a sexta, das 9h às 18h.' },
  away: {
    enabled: false,
    message: 'Recebemos sua mensagem fora do horário comercial. Voltaremos a te responder na próxima manhã útil. Para urgências, ligue 11 99999-9999.',
    business_hours: DEFAULT_BUSINESS_HOURS,
  },
};

function dayDisabled(rules: BusinessHourRule[], day: string): boolean {
  return !rules.find(r => r.day === day);
}

function getRule(rules: BusinessHourRule[], day: string): BusinessHourRule | undefined {
  return rules.find(r => r.day === day);
}

const WhatsAppAutoReplySection = () => {
  const { greeting: serverGreeting, away: serverAway, isLoading, upsert } = useWhatsAppAutoReplies();
  const [draft, setDraft] = useState<DraftState>(DEFAULT_DRAFT);

  useEffect(() => {
    if (isLoading) return;
    setDraft({
      greeting: serverGreeting
        ? { enabled: serverGreeting.enabled, message: serverGreeting.message }
        : DEFAULT_DRAFT.greeting,
      away: serverAway
        ? { enabled: serverAway.enabled, message: serverAway.message, business_hours: serverAway.business_hours ?? DEFAULT_BUSINESS_HOURS }
        : DEFAULT_DRAFT.away,
    });
  }, [serverGreeting, serverAway, isLoading]);

  const toggleDay = (day: BusinessHourRule['day']) => {
    setDraft(d => {
      const has = !!getRule(d.away.business_hours, day);
      const next = has
        ? d.away.business_hours.filter(r => r.day !== day)
        : [...d.away.business_hours, { day, start: '09:00', end: '18:00' }];
      next.sort((a, b) => ALL_DAYS.indexOf(a.day) - ALL_DAYS.indexOf(b.day));
      return { ...d, away: { ...d.away, business_hours: next } };
    });
  };

  const updateHour = (day: BusinessHourRule['day'], field: 'start' | 'end', value: string) => {
    setDraft(d => ({
      ...d,
      away: {
        ...d.away,
        business_hours: d.away.business_hours.map(r => r.day === day ? { ...r, [field]: value } : r),
      },
    }));
  };

  const saveGreeting = async (enabled: boolean) => {
    await upsert.mutateAsync({
      type: 'greeting',
      message: draft.greeting.message,
      enabled,
    });
  };

  const saveAway = async (enabled: boolean) => {
    await upsert.mutateAsync({
      type: 'away',
      message: draft.away.message,
      enabled,
      business_hours: draft.away.business_hours,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Respostas automáticas</h2>
        <p className="text-sm text-muted-foreground">
          Configure mensagens automáticas para primeiro contato e fora do horário comercial.
        </p>
      </div>

      {/* Greeting */}
      <Card className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">Boas-vindas (greeting)</h3>
              <p className="text-xs text-muted-foreground">Enviada automaticamente na primeira mensagem do cliente.</p>
            </div>
          </div>
          <Switch
            checked={draft.greeting.enabled}
            onCheckedChange={(v) => {
              setDraft(d => ({ ...d, greeting: { ...d.greeting, enabled: v } }));
              void saveGreeting(v);
            }}
          />
        </div>
        <Textarea
          value={draft.greeting.message}
          onChange={(e) => setDraft(d => ({ ...d, greeting: { ...d.greeting, message: e.target.value } }))}
          rows={3}
          maxLength={1024}
          placeholder="Mensagem de boas-vindas..."
          disabled={!draft.greeting.enabled}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void saveGreeting(draft.greeting.enabled)} disabled={upsert.isPending} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Salvar boas-vindas
          </Button>
        </div>
      </Card>

      {/* Away */}
      <Card className="p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Moon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold">Fora do horário (away)</h3>
              <p className="text-xs text-muted-foreground">Enviada automaticamente quando cliente envia fora do horário comercial.</p>
            </div>
          </div>
          <Switch
            checked={draft.away.enabled}
            onCheckedChange={(v) => {
              setDraft(d => ({ ...d, away: { ...d.away, enabled: v } }));
              void saveAway(v);
            }}
          />
        </div>

        <Textarea
          value={draft.away.message}
          onChange={(e) => setDraft(d => ({ ...d, away: { ...d.away, message: e.target.value } }))}
          rows={3}
          maxLength={1024}
          placeholder="Mensagem fora do horário..."
          disabled={!draft.away.enabled}
        />

        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm font-medium">Horário comercial (fuso América/São Paulo)</Label>
          </div>
          <div className="space-y-2">
            {ALL_DAYS.map(day => {
              const rule = getRule(draft.away.business_hours, day);
              const disabled = dayDisabled(draft.away.business_hours, day);
              return (
                <div key={day} className="flex items-center gap-3 text-sm">
                  <label className="flex items-center gap-2 w-20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!disabled}
                      onChange={() => toggleDay(day)}
                      className="h-4 w-4 rounded"
                      disabled={!draft.away.enabled}
                    />
                    <span className="font-medium">{DAY_LABELS[day]}</span>
                  </label>
                  {rule ? (
                    <div className="flex items-center gap-2 text-xs">
                      <Input
                        type="time"
                        value={rule.start}
                        onChange={(e) => updateHour(day, 'start', e.target.value)}
                        className="w-28 h-8"
                        disabled={!draft.away.enabled}
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={rule.end}
                        onChange={(e) => updateHour(day, 'end', e.target.value)}
                        className="w-28 h-8"
                        disabled={!draft.away.enabled}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">fechado o dia inteiro</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-start gap-1.5 p-2.5 rounded-md bg-muted/50 border text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Anti-spam: o cliente recebe a mensagem "fora do horário" no máximo 1 vez a cada 4 horas.
            Boas-vindas só dispara na primeira mensagem da conversa.
          </span>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => void saveAway(draft.away.enabled)} disabled={upsert.isPending} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> Salvar fora do horário
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default WhatsAppAutoReplySection;
