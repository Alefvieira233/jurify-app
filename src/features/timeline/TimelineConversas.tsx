import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Clock, User, Bot, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Conversa {
  id: string;
  lead_id: string;
  lead_nome: string;
  tipo: 'whatsapp' | 'email' | 'telefone' | 'agente_ia';
  conteudo: string;
  remetente: 'lead' | 'agente' | 'usuario';
  timestamp: string;
  agente_ia_id?: string;
  agente_ia_nome?: string;
  usuario_nome?: string;
  status: 'enviado' | 'entregue' | 'lido' | 'erro';
  metadata?: {
    telefone?: string;
    email?: string;
    resposta_agente?: boolean;
    tempo_resposta?: number;
  };
}

interface TimelineConversasProps {
  leadId?: string;
  className?: string;
}

const TimelineConversas: React.FC<TimelineConversasProps> = ({ leadId, className = '' }) => {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { profile } = useAuth();

  const fetchConversas = useCallback(async () => {
    if (!profile?.tenant_id) return;

    try {
      setError(null);
      
      let query = supabase
        .from('timeline_conversas')
        .select(`
          id,
          lead_id,
          lead_nome,
          tipo,
          conteudo,
          remetente,
          timestamp,
          agente_ia_id,
          agente_ia_nome,
          usuario_nome,
          status,
          metadata
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('timestamp', { ascending: false });

      if (leadId) {
        query = query.eq('lead_id', leadId);
      }

      const { data, error: fetchError } = await query.limit(100);

      if (fetchError) throw fetchError;

      setConversas(data || []);
    } catch (err) {
      console.error('❌ Erro ao buscar conversas:', err);
      setError('Erro ao carregar timeline de conversas');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, leadId]);

  useEffect(() => {
    void fetchConversas();
  }, [fetchConversas]);

  useEffect(() => {
    if (isAutoRefresh) {
      intervalRef.current = setInterval(() => { void fetchConversas(); }, 30000); // Atualiza a cada 30 segundos
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAutoRefresh, fetchConversas]);

  const filteredConversas = conversas.filter(conversa => {
    const matchesSearch = 
      conversa.lead_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversa.conteudo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversa.agente_ia_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversa.usuario_nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterTipo === '' || conversa.tipo === filterTipo;
    
    return matchesSearch && matchesFilter;
  });

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'whatsapp': return '💬';
      case 'email': return '📧';
      case 'telefone': return '📞';
      case 'agente_ia': return '🤖';
      default: return '💬';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'whatsapp': return 'bg-green-100 text-green-800';
      case 'email': return 'bg-blue-100 text-blue-800';
      case 'telefone': return 'bg-purple-100 text-purple-800';
      case 'agente_ia': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRemetenteColor = (remetente: string) => {
    switch (remetente) {
      case 'lead': return 'bg-blue-500';
      case 'agente': return 'bg-orange-500';
      case 'usuario': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enviado': return 'text-blue-500';
      case 'entregue': return 'text-green-500';
      case 'lido': return 'text-green-700';
      case 'erro': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const toggleCardExpansion = (conversaId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(conversaId)) {
      newExpanded.delete(conversaId);
    } else {
      newExpanded.add(conversaId);
    }
    setExpandedCards(newExpanded);
  };

  const formatTimestamp = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Timeline de Conversas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center">
            <div className="text-red-600 mb-4">
              <MessageCircle className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Erro ao carregar conversas</h3>
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={() => void fetchConversas()} variant="outline" className="border-red-300 text-red-700">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Timeline de Conversas
              {!leadId && (
                <Badge variant="outline" className="ml-2">
                  {filteredConversas.length} conversas
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={isAutoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                {isAutoRefresh ? 'Auto' : 'Manual'}
              </Button>
              <Button onClick={() => void fetchConversas()} variant="outline" size="sm">
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os tipos</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="telefone">Telefone</option>
              <option value="agente_ia">Agente IA</option>
            </select>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {filteredConversas.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma conversa encontrada</p>
                {searchTerm && (
                  <p className="text-sm">Tente ajustar os filtros de busca</p>
                )}
              </div>
            ) : (
              filteredConversas.map((conversa) => {
                const isExpanded = expandedCards.has(conversa.id);
                const conteudoTruncado = conversa.conteudo.length > 150;
                const conteudoExibido = isExpanded || !conteudoTruncado 
                  ? conversa.conteudo 
                  : conversa.conteudo.substring(0, 150) + '...';

                return (
                  <Card key={conversa.id} className="relative border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Avatar/Ícone */}
                        <div className={`h-10 w-10 rounded-full ${getRemetenteColor(conversa.remetente)} flex items-center justify-center text-white font-bold text-sm`}>
                          {conversa.remetente === 'lead' ? <User className="h-4 w-4" /> :
                           conversa.remetente === 'agente' ? <Bot className="h-4 w-4" /> :
                           conversa.usuario_nome?.charAt(0).toUpperCase() || 'U'}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">
                                {conversa.remetente === 'lead' ? conversa.lead_nome :
                                 conversa.remetente === 'agente' ? conversa.agente_ia_nome :
                                 conversa.usuario_nome}
                              </span>
                              <Badge className={getTipoColor(conversa.tipo)}>
                                {getTipoIcon(conversa.tipo)} {conversa.tipo.replace('_', ' ')}
                              </Badge>
                              <span className={`text-xs ${getStatusColor(conversa.status)}`}>
                                ● {conversa.status}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(conversa.timestamp)}
                            </span>
                          </div>

                          {/* Lead Info (se não for específico de um lead) */}
                          {!leadId && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Lead:</span> {conversa.lead_nome}
                            </div>
                          )}

                          {/* Conteúdo da mensagem */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-2">
                            <p className="text-gray-800 whitespace-pre-wrap">
                              {conteudoExibido}
                            </p>
                            {conteudoTruncado && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCardExpansion(conversa.id)}
                                className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-700"
                              >
                                {isExpanded ? (
                                  <>Mostrar menos <ChevronUp className="h-3 w-3 ml-1" /></>
                                ) : (
                                  <>Mostrar mais <ChevronDown className="h-3 w-3 ml-1" /></>
                                )}
                              </Button>
                            )}
                          </div>

                          {/* Metadata */}
                          {conversa.metadata && (
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                              {conversa.metadata.telefone && (
                                <span>📞 {conversa.metadata.telefone}</span>
                              )}
                              {conversa.metadata.email && (
                                <span>📧 {conversa.metadata.email}</span>
                              )}
                              {conversa.metadata.tempo_resposta && (
                                <span>⏱️ {conversa.metadata.tempo_resposta}ms</span>
                              )}
                              {conversa.metadata.resposta_agente && (
                                <span className="text-orange-600">🤖 Resposta automática</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Auto-refresh indicator */}
          {isAutoRefresh && filteredConversas.length > 0 && (
            <div className="text-center mt-4">
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Atualizando automaticamente a cada 30s
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimelineConversas;


