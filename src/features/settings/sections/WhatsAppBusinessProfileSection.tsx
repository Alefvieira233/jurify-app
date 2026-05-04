import { useEffect, useState } from 'react';
import { Save, Building2, Globe, Mail, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBusinessProfile, type BusinessProfile } from '@/hooks/useWhatsAppActions';

const VERTICALS: Array<{ value: string; label: string }> = [
  { value: 'PROFESSIONAL_SERVICES', label: 'Serviços profissionais' },
  { value: 'OTHER', label: 'Outros' },
];

const DEFAULT: BusinessProfile = {
  about: '',
  description: '',
  email: '',
  websites: [],
  address: '',
  vertical: 'PROFESSIONAL_SERVICES',
  profile_picture_url: '',
};

const WhatsAppBusinessProfileSection = () => {
  const { get, update } = useBusinessProfile();
  const [draft, setDraft] = useState<BusinessProfile>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    void get.mutateAsync()
      .then((profile) => { setDraft(profile); setLoaded(true); })
      .catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoaded(false);
    try {
      const profile = await get.mutateAsync();
      setDraft(profile);
    } finally {
      setLoaded(true);
    }
  };

  const save = async () => {
    await update.mutateAsync({
      about: draft.about,
      description: draft.description,
      email: draft.email,
      websites: draft.websites.filter(w => w.trim().length > 0),
      address: draft.address,
      vertical: draft.vertical,
    });
  };

  const isLoading = !loaded && get.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Perfil do WhatsApp Business</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Informações que aparecem para o cliente quando ele toca no nome do escritório no WhatsApp.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={get.isPending} className="gap-1.5 shrink-0">
          <RefreshCw className={`h-3.5 w-3.5 ${get.isPending ? 'animate-spin' : ''}`} />
          Recarregar
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </Card>
      ) : (
        <Card className="p-4 space-y-4">
          <div>
            <Label htmlFor="bp-about" className="text-xs">Status (max 139)</Label>
            <Input
              id="bp-about"
              value={draft.about}
              onChange={(e) => setDraft(d => ({ ...d, about: e.target.value.slice(0, 139) }))}
              placeholder="ex: Advocacia trabalhista — atendimento humanizado"
              maxLength={139}
            />
            <p className="text-[11px] text-muted-foreground mt-1">{draft.about.length}/139 — aparece como subtítulo</p>
          </div>

          <div>
            <Label htmlFor="bp-desc" className="text-xs">Descrição (max 512)</Label>
            <Textarea
              id="bp-desc"
              value={draft.description}
              onChange={(e) => setDraft(d => ({ ...d, description: e.target.value.slice(0, 512) }))}
              rows={3}
              placeholder="Especialistas em direito trabalhista há 15 anos. Atendemos pessoas físicas e jurídicas em todo o Brasil."
              maxLength={512}
            />
            <p className="text-[11px] text-muted-foreground mt-1">{draft.description.length}/512</p>
          </div>

          <div>
            <Label htmlFor="bp-email" className="text-xs flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            <Input
              id="bp-email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft(d => ({ ...d, email: e.target.value }))}
              placeholder="contato@escritorio.com.br"
            />
          </div>

          <div>
            <Label className="text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" /> Sites (até 2)
            </Label>
            <div className="space-y-2 mt-1">
              {[0, 1].map(i => (
                <Input
                  key={i}
                  value={draft.websites[i] ?? ''}
                  onChange={(e) => {
                    const next = [...draft.websites];
                    next[i] = e.target.value;
                    setDraft(d => ({ ...d, websites: next }));
                  }}
                  placeholder={i === 0 ? 'https://escritorio.com.br' : 'https://instagram.com/escritorio'}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="bp-address" className="text-xs flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Endereço (max 256)
            </Label>
            <Input
              id="bp-address"
              value={draft.address}
              onChange={(e) => setDraft(d => ({ ...d, address: e.target.value.slice(0, 256) }))}
              placeholder="Av. Paulista 1000, sala 1500 — Bela Vista, São Paulo/SP — 01310-100"
              maxLength={256}
            />
          </div>

          <div>
            <Label htmlFor="bp-vertical" className="text-xs">Categoria do negócio</Label>
            <Select value={draft.vertical || 'PROFESSIONAL_SERVICES'} onValueChange={(v) => setDraft(d => ({ ...d, vertical: v }))}>
              <SelectTrigger id="bp-vertical">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VERTICALS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button onClick={() => void save()} disabled={update.isPending} className="gap-1.5">
              {update.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar perfil
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default WhatsAppBusinessProfileSection;
