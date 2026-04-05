import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlaceholderClassManagerProps {
  title: string;
  description: string;
  comingSoon?: boolean;
}

/**
 * Placeholder reutilizável para seções de Classes ainda não implementadas.
 * Usado em Origem e Variáveis até terem CRUD completo.
 */
export default function PlaceholderClassManager({
  title,
  description,
  comingSoon = true,
}: PlaceholderClassManagerProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button size="sm" disabled className="h-8 gap-1">
          + Criar {title}
        </Button>
      </div>

      <div className="border border-dashed rounded-lg p-12 text-center bg-muted/10">
        <Construction className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium">
          {comingSoon ? 'Em desenvolvimento' : 'Não configurado'}
        </p>
        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
          Esta seção estará disponível em breve. Por enquanto, use as outras ferramentas de
          classificação disponíveis.
        </p>
      </div>
    </div>
  );
}
