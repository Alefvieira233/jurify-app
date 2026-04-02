import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConsentLog } from '@/hooks/useConsentLog';
import { useTranslation } from 'react-i18next';

const COOKIE_KEY = 'jurify_cookie_consent';

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);
  const { logConsent } = useConsentLog();
  const { t } = useTranslation();

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
    void logConsent('cookies_analytics', true);
    void logConsent('cookies_marketing', true);
    void logConsent('cookies_essential', true);
  };

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setVisible(false);
    void logConsent('cookies_analytics', false);
    void logConsent('cookies_marketing', false);
    void logConsent('cookies_essential', true);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t('cookies.consent')}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Cookie className="h-4 w-4 text-primary" />
            </div>
            <p className="font-semibold text-sm">{t('cookies.title')}</p>
          </div>
          <button
            onClick={decline}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('common.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('cookies.description')}{' '}
          <Link to="/privacidade" className="underline hover:text-foreground transition-colors">
            {t('cookies.lgpd')}
          </Link>{' '}
          {t('cookies.andOur')}{' '}
          <Link to="/privacidade" className="underline hover:text-foreground transition-colors">
            {t('cookies.privacyPolicy')}
          </Link>.
        </p>

        <div className="flex gap-2">
          <Button
            onClick={accept}
            size="sm"
            className="flex-1 h-9 text-xs font-semibold"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {t('cookies.acceptAll')}
          </Button>
          <Button
            onClick={decline}
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs font-semibold"
          >
            {t('cookies.essentialOnly')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
