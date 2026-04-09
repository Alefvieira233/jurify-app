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

/**
 * Generate embed code for external websites.
 * Returns a script tag that can be copied and pasted into any HTML page.
 */
export function generateEmbedCode(phoneNumber: string, officeName: string): string {
  return `<!-- Jurify WhatsApp Widget -->
<script>
(function(){
  var d=document,s=d.createElement('div');
  s.id='jurify-whatsapp-widget';
  s.innerHTML='<a href="https://wa.me/${phoneNumber.replace(/\D/g, '')}?text='+encodeURIComponent('Olá! Gostaria de saber mais sobre os serviços jurídicos de ${officeName}.')+'" target="_blank" rel="noopener" style="position:fixed;bottom:20px;right:20px;z-index:9999;width:56px;height:56px;border-radius:50%;background:#059669;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,0.25);cursor:pointer;transition:transform 0.3s" onmouseover="this.style.transform=\\'scale(1.1)\\'" onmouseout="this.style.transform=\\'scale(1)\\'"><svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.79 23.329l4.47-1.458A11.96 11.96 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-2.226 0-4.29-.612-6.066-1.679l-.435-.258-2.65.865.887-2.583-.283-.449A9.79 9.79 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818 5.422 0 9.818 4.396 9.818 9.818 0 5.422-4.396 9.818-9.818 9.818z"/></svg></a>';
  d.body.appendChild(s);
})();
</script>`;
}
