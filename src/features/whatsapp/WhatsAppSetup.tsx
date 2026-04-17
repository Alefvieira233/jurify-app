/**
 * WhatsApp Setup — redirects to WhatsAppWizard (Kapso platform flow).
 * Legacy wrapper kept for backward compatibility with WhatsAppIA.tsx import.
 */

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { lazyWithRetry } from '@/lib/lazyWithRetry';

const WhatsAppWizard = lazyWithRetry(() => import('@/features/whatsapp/WhatsAppWizard'));

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
