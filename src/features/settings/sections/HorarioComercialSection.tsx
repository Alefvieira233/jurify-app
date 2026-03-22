import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type DaySchedule = {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
};

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Segunda-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Terça-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Quarta-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Quinta-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Sexta-feira', enabled: true, start: '08:00', end: '18:00' },
  { day: 'Sábado', enabled: false, start: '08:00', end: '12:00' },
  { day: 'Domingo', enabled: false, start: '08:00', end: '12:00' },
];

export default function HorarioComercialSection() {
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const { toast } = useToast();

  const updateDay = (index: number, updates: Partial<DaySchedule>) => {
    setSchedule(prev => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  };

  const handleSave = () => {
    toast({ title: 'Horário comercial salvo com sucesso' });
  };

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Horário Comercial</h1>
      <p className="text-sm text-muted-foreground mb-6">Defina os horários de funcionamento da sua empresa.</p>

      <div className="border rounded-lg divide-y">
        {schedule.map((day, i) => (
          <div key={day.day} className="flex items-center gap-4 px-4 py-3">
            <Switch
              checked={day.enabled}
              onCheckedChange={(checked) => updateDay(i, { enabled: checked })}
            />
            <span className="w-32 text-sm font-medium">{day.day}</span>
            <Input
              type="time"
              value={day.start}
              onChange={(e) => updateDay(i, { start: e.target.value })}
              disabled={!day.enabled}
              className="w-28 h-8 text-sm"
            />
            <span className="text-muted-foreground">—</span>
            <Input
              type="time"
              value={day.end}
              onChange={(e) => updateDay(i, { end: e.target.value })}
              disabled={!day.enabled}
              className="w-28 h-8 text-sm"
            />
            <span className={`text-xs ml-auto font-medium ${day.enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
              {day.enabled ? 'Ativo' : 'Fechado'}
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <Button onClick={handleSave}>Salvar alterações</Button>
      </div>
    </div>
  );
}
