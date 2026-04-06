

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, ArrowLeft, Scale } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-primary p-3 rounded-lg">
              <Scale className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Jurify</h1>
              <p className="text-sm text-muted-foreground">Automação Jurídica</p>
            </div>
          </div>
          <CardTitle className="text-6xl font-bold text-foreground mb-4">404</CardTitle>
          <h2 className="text-xl font-semibold text-muted-foreground">Página não encontrada</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            A página que você está procurando não existe ou foi movida.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Link>
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Página Anterior
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
