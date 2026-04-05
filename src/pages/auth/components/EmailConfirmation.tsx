import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';

interface EmailConfirmationProps {
  email: string;
  onBackToLogin: () => void;
}

const EmailConfirmation: React.FC<EmailConfirmationProps> = ({ email, onBackToLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(222_47%_8%)] to-[hsl(222_47%_4%)] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-white/10 border-white/20 backdrop-blur-sm text-white">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-amber-400" />
          </div>
          <CardTitle className="text-xl">Confirme seu email</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-white/70 text-sm leading-relaxed">
            Enviamos um link de confirmação para <strong className="text-white">{email}</strong>.
            Verifique sua caixa de entrada (e a pasta de spam).
          </p>
          <p className="text-white/50 text-xs">
            Após confirmar o email, volte aqui e faça login normalmente.
          </p>
          <Button
            variant="outline"
            className="w-full border-white/30 text-white hover:bg-white/10"
            onClick={onBackToLogin}
          >
            Ir para o login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmation;
