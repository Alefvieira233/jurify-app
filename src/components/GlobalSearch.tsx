import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, FileText, Users, Calendar, Bot, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  type: 'lead' | 'contrato' | 'agendamento' | 'agente';
  title: string;
  subtitle: string;
  route: string;
}

const TYPE_CONFIG = {
  lead: { icon: Users, label: 'Lead', color: 'text-blue-400' },
  contrato: { icon: FileText, label: 'Contrato', color: 'text-emerald-400' },
  agendamento: { icon: Calendar, label: 'Agendamento', color: 'text-amber-400' },
  agente: { icon: Bot, label: 'Agente IA', color: 'text-purple-400' },
};

const QUICK_LINKS = [
  { label: 'Dashboard', route: '/', icon: Search },
  { label: 'Leads', route: '/leads', icon: Users },
  { label: 'Contratos', route: '/contratos', icon: FileText },
  { label: 'WhatsApp', route: '/whatsapp', icon: MessageSquare },
  { label: 'Agentes IA', route: '/agentes', icon: Bot },
  { label: 'Agendamentos', route: '/agendamentos', icon: Calendar },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  // Ctrl+K to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search
  const search = useCallback(async (term: string) => {
    if (!term || term.length < 2 || !profile?.tenant_id) {
      setResults([]);
      return;
    }

    setLoading(true);
    const tenantId = profile.tenant_id;
    const searchResults: SearchResult[] = [];

    try {
      // Search leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, nome_completo, email, status')
        .eq('tenant_id', tenantId)
        .or(`nome_completo.ilike.%${term}%,email.ilike.%${term}%`)
        .limit(5);

      leads?.forEach(l => {
        searchResults.push({
          id: l.id,
          type: 'lead',
          title: l.nome_completo || 'Sem nome',
          subtitle: `${l.email || ''} Â· ${l.status || 'novo'}`,
          route: '/leads',
        });
      });

      // Search contratos
      const { data: contratos } = await supabase
        .from('contratos')
        .select('id, nome_cliente, area_juridica, status')
        .eq('tenant_id', tenantId)
        .or(`nome_cliente.ilike.%${term}%,area_juridica.ilike.%${term}%`)
        .limit(5);

      contratos?.forEach(c => {
        searchResults.push({
          id: c.id,
          type: 'contrato',
          title: c.nome_cliente || 'Sem cliente',
          subtitle: `${c.area_juridica || ''} Â· ${c.status || ''}`,
          route: '/contratos',
        });
      });

      // Search agendamentos
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('id, titulo, tipo, status')
        .eq('tenant_id', tenantId)
        .ilike('titulo', `%${term}%`)
        .limit(5);

      agendamentos?.forEach(a => {
        searchResults.push({
          id: a.id,
          type: 'agendamento',
          title: a.titulo || 'Sem tÃ­tulo',
          subtitle: `${a.tipo || ''} Â· ${a.status || ''}`,
          route: '/agendamentos',
        });
      });

      setResults(searchResults);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search error:', err);
      toast({
        title: 'Erro na busca',
        description: 'NÃ£o foi possÃ­vel realizar a busca. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.tenant_id]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => void search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = query.length >= 2 ? results : QUICK_LINKS;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.length >= 2 && results[selectedIndex]) {
        navigate(results[selectedIndex].route);
        setOpen(false);
      } else if (query.length < 2 && QUICK_LINKS[selectedIndex]) {
        navigate(QUICK_LINKS[selectedIndex].route);
        setOpen(false);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))]">
          <Search className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar leads, contratos, agendamentos..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')}>
              <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[10px] font-mono bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {loading && (
            <div className="flex items-center justify-center py-8 text-sm text-[hsl(var(--muted-foreground))]">
              Buscando...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-[hsl(var(--muted-foreground))]">
              Nenhum resultado para "{query}"
            </div>
          )}

          {!loading && query.length >= 2 && results.map((result, i) => {
            const config = TYPE_CONFIG[result.type];
            const Icon = config.icon;
            return (
              <button
                key={result.id}
                onClick={() => { navigate(result.route); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  i === selectedIndex
                    ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                    : 'hover:bg-[hsl(var(--accent))]'
                }`}
              >
                <Icon className={`w-4 h-4 ${config.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{result.title}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] truncate">{result.subtitle}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                  {config.label}
                </span>
                <ArrowRight className="w-3 h-3 text-[hsl(var(--muted-foreground))]" />
              </button>
            );
          })}

          {/* Quick links when no query */}
          {query.length < 2 && !loading && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                NavegaÃ§Ã£o rÃ¡pida
              </div>
              {QUICK_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.route}
                    onClick={() => { navigate(link.route); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      i === selectedIndex
                        ? 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                        : 'hover:bg-[hsl(var(--accent))]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    <span className="text-sm">{link.label}</span>
                    <ArrowRight className="w-3 h-3 ml-auto text-[hsl(var(--muted-foreground))]" />
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[hsl(var(--border))] text-[10px] text-[hsl(var(--muted-foreground))]">
          <span><kbd className="font-mono">â†‘â†“</kbd> navegar</span>
          <span><kbd className="font-mono">Enter</kbd> abrir</span>
          <span><kbd className="font-mono">Esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
