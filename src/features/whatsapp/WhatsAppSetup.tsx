/**
 * WhatsApp Setup — redirects to WhatsAppWizard (Kapso platform flow).
 * Legacy wrapper kept for backward compatibility with WhatsAppIA.tsx import.
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const WhatsAppWizard = lazy(() => import('@/features/conexoes/WhatsAppWizard'));

interface WhatsAppSetupProps {
  onConnectionSuccess?: () => void;
}

export default function WhatsAppSetup({ onConnectionSuccess }: WhatsAppSetupProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <WhatsAppWizard onClose={() => {}} onConnected={() => onConnectionSuccess?.()} />
    </Suspense>
  );
}
