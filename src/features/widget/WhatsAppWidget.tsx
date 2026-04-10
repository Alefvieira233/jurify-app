/**
 * WhatsApp Widget — Embeddable floating button for law firm websites.
 *
 * Usage in Jurify app: renders in bottom-right corner with pre-filled message.
 * Usage on external site: generates embed code (script tag) in settings.
 */

import { memo, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface WhatsAppWidgetProps {
  /** WhatsApp phone number (digits only, e.g., "5511999999999") */
  phoneNumber: string;
  /** Office name shown in the widget */
  officeName?: string;
  /** Pre-filled message when opening WhatsApp */
  defaultMessage?: string;
  /** Position: bottom-right or bottom-left */
  position?: 'right' | 'left';
}

const WhatsAppWidget = memo(({
  phoneNumber,
  officeName = 'nosso escritório',
  defaultMessage = 'Olá! Gostaria de saber mais sobre os serviços jurídicos do escritório.',
  position = 'right',
}: WhatsAppWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);

  const posClass = position === 'right' ? 'right-5' : 'left-5';

  const handleSend = () => {
    const encoded = encodeURIComponent(message);
    const phone = phoneNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className={`fixed bottom-5 ${posClass} z-50`}>
      {/* Chat popup */}
      {isOpen && (
        <div className="mb-3 w-[320px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{officeName}</p>
                <p className="text-[11px] text-white/70">Geralmente responde em minutos</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">
                Olá! 👋 Bem-vindo ao {officeName}. Como podemos ajudar você hoje?
              </p>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Digite sua mensagem..."
            />

            <button
              onClick={handleSend}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar via WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center ${isOpen ? 'scale-90' : 'hover:scale-110'}`}
        aria-label="Abrir chat WhatsApp"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>
    </div>
  );
});

WhatsAppWidget.displayName = 'WhatsAppWidget';

export default WhatsAppWidget;
