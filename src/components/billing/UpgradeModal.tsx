import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, Brain, Users, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { LimitableResource } from '@/hooks/usePlanLimits';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: LimitableResource;
  currentUsage?: number;
  limit?: number;
}

const RESOURCE_INFO: Record<LimitableResource, { icon: React.ElementType; label: string; upgradeLabel: string }> = {
  ai_calls: { icon: Brain, label: 'Chamadas de IA', upgradeLabel: '500 chamadas/mês' },
  leads: { icon: TrendingUp, label: 'Leads', upgradeLabel: '1.000 leads' },
  users: { icon: Users, label: 'Usuários', upgradeLabel: '10 usuários' },
  storage_mb: { icon: Zap, label: 'Armazenamento', upgradeLabel: '1 GB' },
};

export const UpgradeModal = ({ open, onOpenChange, resource, currentUsage, limit }: UpgradeModalProps) => {
  const navigate = useNavigate();
  const info = RESOURCE_INFO[resource];
  const Icon = info.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-amber-500" />
            Limite Atingido
          </DialogTitle>
          <DialogDescription>
            Você atingiu o limite de <strong>{info.label.toLowerCase()}</strong> do seu plano atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {currentUsage !== undefined && limit !== undefined && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <span className="text-sm text-red-700 dark:text-red-400">
                {info.label}: {currentUsage} / {limit}
              </span>
              <Badge variant="destructive" className="text-xs">Limite</Badge>
            </div>
          )}

          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border border-purple-200 dark:border-purple-800">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">
              Upgrade para o Plano Profissional
            </p>
            <ul className="space-y-1 text-xs text-purple-700 dark:text-purple-300">
              <li>✓ 500 chamadas de IA/mês</li>
              <li>✓ 1.000 leads</li>
              <li>✓ 10 usuários</li>
              <li>✓ WhatsApp Oficial</li>
              <li>✓ Relatórios Avançados</li>
            </ul>
            <p className="mt-3 text-lg font-bold text-purple-900 dark:text-purple-100">
              R$ 99<span className="text-xs font-normal">/mês</span>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                onOpenChange(false);
                navigate('/billing');
              }}
            >
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Fazer Upgrade
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
