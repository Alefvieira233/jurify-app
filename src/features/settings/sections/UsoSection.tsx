import { Info } from 'lucide-react';

export default function UsoSection() {
  const limits = [
    { label: 'Membros', current: 1, max: 0, hasInfo: true },
    { label: 'Agentes de IA', current: 2, max: 0, hasInfo: true },
    { label: 'Conexões WhatsApp', current: 1, max: 0, hasInfo: true },
    { label: 'Workspaces', current: 1, max: 0, hasInfo: true },
    { label: 'Vozes', current: 0, max: 0, hasInfo: true },
    { label: 'Armazenamento', current: 0, max: 0, unit: 'GB', hasInfo: true },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">Uso</h1>
      <p className="text-sm text-muted-foreground mb-6">Acompanhe o consumo e métricas de uso da plataforma.</p>

      {/* Limits grid */}
      <div className="mb-8">
        <h2 className="text-sm font-medium mb-3">Limites de uso</h2>
        <p className="text-xs text-muted-foreground mb-4">Uso atual vs. limites do plano.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {limits.map(limit => (
            <div key={limit.label} className="flex items-start gap-2">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {limit.label}
                  {limit.hasInfo && <Info className="h-3 w-3" />}
                </p>
                <p className="text-sm font-semibold">
                  <span className="text-primary">{limit.current}</span>
                  <span className="text-muted-foreground"> / {limit.max}</span>
                  {limit.unit && <span className="text-muted-foreground text-xs ml-1">{limit.unit}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit consumption */}
      <div className="border rounded-lg p-4">
        <h2 className="text-sm font-medium mb-1">Consumo de Créditos</h2>
        <p className="text-xs text-muted-foreground mb-4">Ciclo de reinício dos créditos de IA da plataforma.</p>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Agentes de IA</span>
            <span>0</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground ml-3">
            <span>Respostas automatizadas</span>
            <span>0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Processamento</span>
            <span>0</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground ml-3">
            <span>Normalização de nomes</span>
            <span>0</span>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground ml-3">
            <span>Leitura de imagens</span>
            <span>0</span>
          </div>
          <div className="border-t pt-2 mt-2 flex items-center justify-between text-sm font-semibold">
            <span>Total de créditos</span>
            <span>0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
