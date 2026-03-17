import { MessageSquare, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConnectionTypeChooserProps {
  onSelect: (type: 'evolution' | 'oficial') => void;
}

const ConnectionTypeChooser = ({ onSelect }: ConnectionTypeChooserProps) => {
  const { toast } = useToast();

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-foreground">
        Escolha o tipo de conexão WhatsApp
      </h2>
      <p className="text-sm text-muted-foreground mt-1">
        Selecione como deseja conectar sua conta WhatsApp à plataforma
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        {/* API Não Oficial */}
        <button
          type="button"
          onClick={() => onSelect('evolution')}
          className="group text-left border rounded-xl p-6 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 hover:shadow-md"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">API Não Oficial</h3>
              <p className="text-xs text-muted-foreground">
                Conexão rápida via QR Code ou Pair Code
              </p>
            </div>
          </div>
          <ul className="space-y-2 mt-4">
            {['Conexão rápida', 'Sem aprovação de templates', 'Sem janela de conversação'].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </button>

        {/* API Oficial */}
        <button
          type="button"
          onClick={() => {
            toast({
              title: 'Em breve',
              description: 'A integração com a API Oficial do WhatsApp Business estará disponível em breve.',
            });
          }}
          className="group text-left border rounded-xl p-6 hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all duration-200 hover:shadow-md relative"
        >
          <div className="absolute top-3 right-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              Em breve
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">API Oficial</h3>
              <p className="text-xs text-muted-foreground">
                API oficial WhatsApp Business da Meta
              </p>
            </div>
          </div>
          <ul className="space-y-2 mt-4">
            {['Selo verde verificado oficial', 'Envio de campanhas em massa', 'Maior confiabilidade empresarial'].map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />
                {benefit}
              </li>
            ))}
          </ul>
        </button>
      </div>
    </div>
  );
};

export default ConnectionTypeChooser;
