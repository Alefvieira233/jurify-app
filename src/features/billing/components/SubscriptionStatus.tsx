import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle } from 'lucide-react';
import type { Subscription } from './usePlans';

interface SubscriptionStatusProps {
  currentPlan: string;
  subscription: Subscription | null;
  openingPortal: boolean;
  onOpenPortal: () => void;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  currentPlan,
  subscription,
  openingPortal,
  onOpenPortal,
}) => {
  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Seu Plano Atual
            </CardTitle>
            <CardDescription>Gerenciamento de assinatura e uso</CardDescription>
          </div>
          <Badge variant={currentPlan === 'enterprise' ? 'default' : 'secondary'} className="text-lg px-4 py-1">
            {currentPlan.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {subscription && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Status: {subscription.status}
              </span>
              {subscription.current_period_end && (
                <span>
                  Proxima cobranca: {new Date(subscription.current_period_end).toLocaleDateString('pt-BR')}
                </span>
              )}
              {subscription.cancel_at_period_end && (
                <Badge variant="destructive">Cancela ao fim do periodo</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenPortal}
              disabled={openingPortal}
              data-testid="btn-manage-subscription"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {openingPortal ? 'Abrindo...' : 'Gerenciar Assinatura'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
