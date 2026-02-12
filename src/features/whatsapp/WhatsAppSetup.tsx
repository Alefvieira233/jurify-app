/**
 * WhatsApp Setup - Direct QR Code connection via Evolution API
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const WhatsAppEvolutionSetup = lazy(() => import('./WhatsAppEvolutionSetup'));

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
      <WhatsAppEvolutionSetup onConnectionSuccess={onConnectionSuccess} />
    </Suspense>
  );
}
