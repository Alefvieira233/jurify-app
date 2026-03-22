import { MessageSquare, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConnectionTypeChooserProps {
  onSelect: (type: 'evolution' | 'oficial') => void;
}

const ConnectionTypeChooser = ({ onSelect }: ConnectionTypeChooserProps) => {
  const { toast } = useToast();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Adicionar Novo Canal
        </h2>
        <p className="text-sm text-muted-foreground mt-1.5">
          Selecione a infraestrutura de disparo para conectar ao Jurify.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* API Não Oficial */}
        <button
          type="button"
          onClick={() => onSelect('evolution')}
          className="group text-left border border-border/10 rounded-[20px] p-6 hover:border-primary/40 focus:border-primary/40 outline-none hover:bg-primary/5 transition-all duration-300 hover:shadow-2xl focus:shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">API Não Oficial (Evo)</h3>
              <p className="text-xs text-muted-foreground">
                Conexão instantânea via leitura de QR Code
              </p>
            </div>
          </div>
          <ul className="space-y-3 mt-6">
            {['Integração em 2 minutos via Celular', 'Não requer aprovação de templates (Meta)', 'Disparo em massa imediato', 'Ideal para funis de captação abertos'].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </button>

        {/* API Oficial (Em Breve) */}
        <button
          type="button"
          onClick={() => {
            toast({
              title: 'Exclusivo Plano Enterprise',
              description: 'A integração com a WhatsApp Cloud API Oficial está no roadmap VIP.',
            });
          }}
          className="group text-left border border-border/10 rounded-[20px] p-6 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300 relative overflow-hidden focus:outline-none opacity-80"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute top-4 right-4">
            <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 shadow-sm">
              Módulo Enterprise
            </span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">WhatsApp Cloud API</h3>
              <p className="text-xs text-muted-foreground">
                Padrão ouro de comunicação corporativa
              </p>
            </div>
          </div>
          <ul className="space-y-3 mt-6">
            {['Selo Verde de verificação oficial da Meta', 'Zero risco de banimento de número', 'Alta entregabilidade garantida'].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </button>
      </div>
    </div>
  );
};

export default ConnectionTypeChooser;
