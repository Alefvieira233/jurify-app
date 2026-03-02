import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COOKIE_KEY = 'jurify_cookie_consent';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      // Small delay so it doesn't appear during page load flash
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Cookie className="h-4 w-4 text-primary" />
            </div>
            <p className="font-semibold text-sm">Privacidade & Cookies</p>
          </div>
          <button
            onClick={decline}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Utilizamos cookies essenciais para o funcionamento da plataforma e, com seu consentimento,
          cookies analíticos para melhoria do serviço. Seus dados são tratados conforme a{' '}
          <Link to="/privacidade" className="underline hover:text-foreground transition-colors">
            LGPD
          </Link>{' '}
          e nossa{' '}
          <Link to="/privacidade" className="underline hover:text-foreground transition-colors">
            Política de Privacidade
          </Link>.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={accept}
            size="sm"
            className="flex-1 h-9 text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Aceitar todos
          </Button>
          <Button
            onClick={decline}
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs font-semibold"
          >
            Apenas essenciais
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
