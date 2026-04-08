import { PartyPopper } from 'lucide-react';

interface CelebrationBannerProps {
  show: boolean;
}

const CelebrationBanner = ({ show }: CelebrationBannerProps) => {
  if (!show) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/30 p-4 mb-2">
      <PartyPopper className="h-6 w-6 text-green-500 shrink-0" />
      <div>
        <p className="font-semibold text-green-700 dark:text-green-400">
          Tudo pronto! Parabens!
        </p>
        <p className="text-sm text-green-600 dark:text-green-500">
          Todas as 7 etapas foram concluidas. Seu escritorio esta 100% configurado.
        </p>
      </div>
    </div>
  );
};

export default CelebrationBanner;
