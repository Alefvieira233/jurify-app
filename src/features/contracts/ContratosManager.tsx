
import { useState, useMemo } from 'react';
import { Plus, Search, Eye, Edit, FileSignature, Send, AlertCircle, RefreshCw } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useContratos } from '@/hooks/useContratos';
import type { Contrato } from '@/hooks/useContratos';
import { fmtCurrency, fmtDate } from '@/utils/formatting';
import UploadContratos from '@/components/UploadContratos';
import { NovoContratoForm } from '@/components/NovoContratoForm';
import { DetalhesContrato } from '@/components/DetalhesContrato';

const ContratosManager = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('');
  const [isNovoContratoOpen, setIsNovoContratoOpen] = useState(false);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const { contratos, loading, error, isEmpty, fetchContratos } = useContratos();

  const filteredContratos = useMemo(() => contratos.filter(contrato => {
    const matchesSearch = contrato.nome_cliente?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || false;
    const matchesStatus = filterStatus === '' || contrato.status === filterStatus;
    return matchesSearch && matchesStatus;
  }), [contratos, debouncedSearchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
    const colors = {
      rascunho: 'bg-slate-500/15 text-slate-200 border border-slate-400/30',
      enviado: 'bg-blue-500/15 text-blue-200 border border-blue-400/30',
      assinado: 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30',
      cancelado: 'bg-red-500/15 text-red-200 border border-red-400/30'
    };
    return (colors as Record<string, string>)[status] || 'bg-slate-500/15 text-slate-200 border border-slate-400/30';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      rascunho: 'Rascunho',
      enviado: 'Enviado',
      assinado: 'Assinado',
      cancelado: 'Cancelado'
    };
    return (labels as Record<string, string>)[status] || status;
  };

  const handleRetry = () => {
    fetchContratos();
  };

  const handleOpenDetails = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setIsDetalhesOpen(true);
  };

  const handleCloseDetails = () => {
    setIsDetalhesOpen(false);
    setSelectedContrato(null);
    fetchContratos();
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestão de Contratos</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">Gerencie contratos e assinaturas digitais</p>
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-40" />
            </div>
          </CardContent>
        </Card>
        
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestão de Contratos</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">Gerencie contratos e assinaturas digitais</p>
              </div>
              <Button onClick={() => setIsNovoContratoOpen(true)} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
                <Plus className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-red-900 mb-2">Erro ao carregar contratos</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={handleRetry}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-100"
                >
                  Recarregar página
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Gestão de Contratos</CardTitle>
                <p className="text-[hsl(var(--muted-foreground))]">Gerencie contratos e assinaturas digitais</p>
              </div>
              <Button onClick={() => setIsNovoContratoOpen(true)} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
                <Plus className="h-4 w-4 mr-2" />
                Novo Contrato
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardContent className="p-8">
            <div className="text-center">
              <FileSignature className="h-16 w-16 text-blue-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">Nenhum contrato cadastrado</h3>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">Comece criando seu primeiro contrato para gerenciar assinaturas digitais.</p>
              <Button onClick={() => setIsNovoContratoOpen(true)} className="bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-hover))] text-[hsl(var(--accent-foreground))]">
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro contrato
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Content
  return (
    <div className="p-6 space-y-6">
      {/* Header Premium */}
      <div className="relative fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1
              className="text-5xl md:text-6xl font-bold text-[hsl(var(--primary))] tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '-0.03em' }}
            >
              Contratos
            </h1>

            {/* Live Badge */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--accent)_/_0.3)] via-[hsl(var(--accent)_/_0.2)] to-transparent rounded-full blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative px-4 py-2 bg-gradient-to-r from-[hsl(var(--accent)_/_0.15)] via-[hsl(var(--accent)_/_0.1)] to-transparent rounded-full border border-[hsl(var(--accent)_/_0.3)] backdrop-blur-sm">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Live
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {/* Refresh Button Premium */}
            <Button
              onClick={handleRetry}
              variant="outline"
              size="sm"
              className="relative group/btn overflow-hidden border-[hsl(var(--border))] hover:border-[hsl(var(--accent)_/_0.5)] transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--accent)_/_0.1)] to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <RefreshCw className="h-4 w-4 mr-2 group-hover/btn:rotate-180 transition-transform duration-700" />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>Atualizar</span>
            </Button>

            {/* Novo Contrato Button Premium */}
            <Button
              onClick={() => setIsNovoContratoOpen(true)}
              className="relative group/btn overflow-hidden bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(43_96%_56%)] to-[hsl(43_96%_48%)] hover:shadow-lg transition-all duration-500 border-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--accent))] via-[hsl(43_96%_62%)] to-[hsl(var(--accent))] opacity-0 group-hover/btn:opacity-100 blur-xl transition-opacity duration-500" style={{ filter: 'blur(20px)' }} />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000" />
              <Plus className="relative h-4 w-4 mr-2" strokeWidth={2.5} />
              <span className="relative" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>Novo Contrato</span>
            </Button>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[hsl(var(--muted-foreground))] mt-3 text-base" style={{ fontFamily: "'Inter', sans-serif" }}>
          Gerencie contratos e assinaturas digitais - <span className="font-semibold text-[hsl(var(--accent))]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{contratos.length}</span> contratos no total
        </p>
      </div>

      <Tabs defaultValue="contratos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 bg-[hsl(var(--muted))] border border-[hsl(var(--border))]">
          <TabsTrigger value="contratos">Lista de Contratos</TabsTrigger>
          <TabsTrigger value="upload">Upload de Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="contratos" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[hsl(var(--muted-foreground))] h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome do cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[hsl(var(--card))] border-[hsl(var(--border))] text-[hsl(var(--foreground))]"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-2 border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] rounded-lg focus:ring-2 focus:ring-[hsl(var(--accent))] focus:border-transparent"
                >
                  <option value="">Todos os Status</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="enviado">Enviado</option>
                  <option value="assinado">Assinado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Contratos */}
          <div className="grid gap-4">
            {filteredContratos.map((contrato) => (
              <Card key={contrato.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">
                          {contrato.nome_cliente}
                        </h3>
                        <Badge className={getStatusColor(contrato.status ?? '')}>
                          {getStatusLabel(contrato.status ?? '')}
                        </Badge>
                        {contrato.status_assinatura && (
                          <Badge variant="outline">
                            {contrato.status_assinatura}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                        <div>
                          <span className="font-medium">Área Jurídica:</span> {contrato.area_juridica}
                        </div>
                        <div>
                          <span className="font-medium">Responsável:</span> {contrato.responsavel}
                        </div>
                        <div>
                          <span className="font-medium">Valor da Causa:</span> {fmtCurrency(Number(contrato.valor_causa))}
                        </div>
                        {contrato.data_envio && (
                          <div>
                            <span className="font-medium">Data de Envio:</span> {fmtDate(contrato.data_envio)}
                          </div>
                        )}
                        {contrato.data_assinatura && (
                          <div>
                            <span className="font-medium">Data de Assinatura:</span> {fmtDate(contrato.data_assinatura)}
                          </div>
                        )}
                      </div>

                      {contrato.observacoes && (
                        <div className="text-sm text-[hsl(var(--muted-foreground))]">
                          <span className="font-medium">Observações:</span> {contrato.observacoes}
                        </div>
                      )}

                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        Criado em: {fmtDate(contrato.created_at)}
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]" onClick={() => handleOpenDetails(contrato)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="bg-[hsl(var(--card))] border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]" onClick={() => handleOpenDetails(contrato)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {contrato.status === 'rascunho' && (
                        <Button variant="outline" size="sm" className="text-blue-300 hover:text-blue-200" onClick={() => handleOpenDetails(contrato)}>
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {contrato.link_assinatura_zapsign && (
                        <Button variant="outline" size="sm" className="text-emerald-200 hover:text-emerald-100" onClick={() => handleOpenDetails(contrato)}>
                          <FileSignature className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredContratos.length === 0 && searchTerm && (
            <Card className="border-amber-500/30 bg-amber-500/10">
              <CardContent className="p-8">
                <div className="text-center">
                  <Search className="h-12 w-12 text-amber-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-[hsl(var(--foreground))] mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-[hsl(var(--muted-foreground))]">
                    Não foram encontrados contratos com o termo "{searchTerm}". Tente ajustar sua busca.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="upload">
          <UploadContratos
            onUploadComplete={() => {
              fetchContratos();
            }}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isNovoContratoOpen} onOpenChange={setIsNovoContratoOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <NovoContratoForm onClose={() => {
            setIsNovoContratoOpen(false);
            fetchContratos();
          }} />
        </DialogContent>
      </Dialog>

      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Contrato</DialogTitle>
          </DialogHeader>
          {selectedContrato && (
            <DetalhesContrato contrato={selectedContrato as unknown as Parameters<typeof DetalhesContrato>[0]['contrato']} onClose={handleCloseDetails} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContratosManager;



