import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionStatus = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const isPro = profile?.subscription_status === 'active';
    const planName = profile?.subscription_tier === 'pro' ? 'Profissional' :
        profile?.subscription_tier === 'enterprise' ? 'Enterprise' : 'Gratuito';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Assinatura
                </CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-2xl font-bold">{planName}</div>
                        <div className="flex items-center text-xs text-muted-foreground">
                            {isPro ? (
                                <>
                                    <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                                    Ativo
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="mr-1 h-3 w-3 text-yellow-500" />
                                    {profile?.subscription_status || 'Free'}
                                </>
                            )}
                        </div>
                    </div>
                    <Button
                        variant={isPro ? "outline" : "default"}
                        size="sm"
                        onClick={() => navigate('/planos')}
                    >
                        {isPro ? 'Gerenciar' : 'Fazer Upgrade'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default SubscriptionStatus;
