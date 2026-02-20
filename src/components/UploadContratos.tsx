import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Shield, CheckCircle, AlertTriangle, Loader2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/utils/validation';

interface ArquivoMetadados {
  paginas?: number;
  dataUltimaModificacao?: string;
  versao?: string;
  tipoContrato?: string;
  classificacaoSeguranca?: string;
  tamanhoBytes?: number;
  tipoMime?: string;
  nome?: string;
}

interface ArquivoUpload {
  id: string;
  file: File;
  nome: string;
  tamanho: number;
  tipo: string;
  status: 'pendente' | 'validando' | 'aprovado' | 'rejeitado' | 'enviando' | 'concluido' | 'erro';
  progresso: number;
  mensagemValidacao?: string;
  url?: string;
  hashSeguranca?: string;
  metadados?: ArquivoMetadados;
}

interface UploadContratosProps {
  onUploadComplete?: (arquivos: ArquivoUpload[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // MB
  acceptedTypes?: string[];
}

const UploadContratos: React.FC<UploadContratosProps> = ({
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 50,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt']
}) => {
  const [arquivos, setArquivos] = useState<ArquivoUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Validação de segurança de arquivos
  const validarSegurancaArquivo = (file: File): Promise<{ aprovado: boolean; mensagem: string; metadados: ArquivoMetadados }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          
          // ðŸš€ VALIDAÃ‡Ã•ES DE SEGURANÃ‡A ENTERPRISE
          const validacoes = {
            // Verificar magic numbers (assinatura do arquivo)
            magicNumber: verificarMagicNumber(bytes, file.type),
            
            // Verificar tamanho suspeito
            tamanhoSuspeito: file.size > maxFileSize * 1024 * 1024,
            
            // Verificar extensão vs tipo MIME
            extensaoValida: verificarExtensaoTipo(file.name, file.type),
            
            // Detectar padrões maliciosos simples
            conteudoSuspeito: detectarConteudoSuspeito(bytes),
            
            // Metadados do arquivo
            metadados: extrairMetadados(file)
          };

          const aprovado = validacoes.magicNumber && 
                          !validacoes.tamanhoSuspeito && 
                          validacoes.extensaoValida && 
                          !validacoes.conteudoSuspeito;

          let mensagem = '';
          if (!aprovado) {
            if (!validacoes.magicNumber) mensagem += 'Tipo de arquivo inválido. ';
            if (validacoes.tamanhoSuspeito) mensagem += `Arquivo muito grande (máx ${maxFileSize}MB). `;
            if (!validacoes.extensaoValida) mensagem += 'Extensão não corresponde ao tipo. ';
            if (validacoes.conteudoSuspeito) mensagem += 'Conteúdo suspeito detectado. ';
          } else {
            mensagem = 'Arquivo validado com sucesso âœ“';
          }

          resolve({
            aprovado,
            mensagem: mensagem.trim(),
            metadados: validacoes.metadados
          });
        } catch (_error) {
          resolve({
            aprovado: false,
            mensagem: 'Erro na validação de segurança',
            metadados: {}
          });
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const verificarMagicNumber = (bytes: Uint8Array, mimeType: string): boolean => {
    const magicNumbers: Record<string, number[][]> = {
      'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
      'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]], // MS Office
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]], // ZIP-based
      'text/plain': [[0x00, 0x00, 0x00, 0x00]] // Texto (mais flexível)
    };

    const expectedMagic = magicNumbers[mimeType];
    if (!expectedMagic) return false;

    return expectedMagic.some(magic => 
      magic.every((byte, index) => bytes[index] === byte || byte === 0x00)
    );
  };

  const verificarExtensaoTipo = (fileName: string, mimeType: string): boolean => {
    const extensao = fileName.split('.').pop()?.toLowerCase();
    const tiposPermitidos: Record<string, string[]> = {
      'pdf': ['application/pdf'],
      'doc': ['application/msword'],
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'txt': ['text/plain']
    };

    return extensao ? tiposPermitidos[extensao]?.includes(mimeType) || false : false;
  };

  const detectarConteudoSuspeito = (bytes: Uint8Array): boolean => {
    // Padrões suspeitos básicos
    const padroesProibidos = [
      // Scripts maliciosos
      [0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // <script
      [0x6A, 0x61, 0x76, 0x61, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74], // javascript
      // Executáveis
      [0x4D, 0x5A], // MZ (executável)
      [0x7F, 0x45, 0x4C, 0x46], // ELF
    ];

    return padroesProibidos.some(padrao =>
      bytes.some((_, index) =>
        padrao.every((byte, offset) => bytes[index + offset] === byte)
      )
    );
  };

  const extrairMetadados = (file: File): ArquivoMetadados => {
    return {
      dataUltimaModificacao: new Date(file.lastModified).toISOString(),
      tamanhoBytes: file.size,
      tipoMime: file.type,
      nome: sanitizeText(file.name)
    };
  };

  const gerarHashSeguranca = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const processarArquivos = async (files: File[]) => {
    if (!user || !profile?.tenant_id) {
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não autenticado',
        variant: 'destructive'
      });
      return;
    }

    if (arquivos.length + files.length > maxFiles) {
      toast({
        title: 'Limite excedido',
        description: `Máximo ${maxFiles} arquivos permitidos`,
        variant: 'destructive'
      });
      return;
    }

    const novosArquivos: ArquivoUpload[] = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      nome: sanitizeText(file.name),
      tamanho: file.size,
      tipo: file.type,
      status: 'pendente',
      progresso: 0
    }));

    setArquivos(prev => [...prev, ...novosArquivos]);

    // Processar cada arquivo
    for (const arquivo of novosArquivos) {
      await processarArquivoIndividual(arquivo);
    }

    onUploadComplete?.(novosArquivos);
  };

  const processarArquivoIndividual = async (arquivo: ArquivoUpload) => {
    try {
      // 1. Validação de segurança
      atualizarStatusArquivo(arquivo.id, 'validando', 10);
      
      const validacao = await validarSegurancaArquivo(arquivo.file);
      
      if (!validacao.aprovado) {
        atualizarStatusArquivo(arquivo.id, 'rejeitado', 100, validacao.mensagem);
        return;
      }

      atualizarStatusArquivo(arquivo.id, 'aprovado', 30, validacao.mensagem);

      // 2. Gerar hash de segurança
      const hash = await gerarHashSeguranca(arquivo.file);
      
      // 3. Upload para Supabase Storage
      atualizarStatusArquivo(arquivo.id, 'enviando', 50);

      const nomeArquivoSeguro = `${profile!.tenant_id}/${Date.now()}-${sanitizeText(arquivo.file.name)}`;
      
      const { error: uploadError } = await supabase.storage
        .from('contratos')
        .upload(nomeArquivoSeguro, arquivo.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 4. Obter URL pública
      const { data: urlData } = supabase.storage
        .from('contratos')
        .getPublicUrl(nomeArquivoSeguro);

      // 5. Salvar metadados no banco
      atualizarStatusArquivo(arquivo.id, 'enviando', 80);

      const { error: dbError } = await supabase
        .from('contratos_uploads')
        .insert({
          tenant_id: profile!.tenant_id,
          nome_arquivo: arquivo.nome,
          caminho_storage: nomeArquivoSeguro,
          url_publica: urlData.publicUrl,
          tamanho_bytes: arquivo.tamanho,
          tipo_mime: arquivo.tipo,
          hash_seguranca: hash,
          metadados: validacao.metadados,
          usuario_upload: user!.id
        });

      if (dbError) throw dbError;

      // 6. Finalizar
      atualizarArquivo(arquivo.id, {
        status: 'concluido',
        progresso: 100,
        url: urlData.publicUrl,
        hashSeguranca: hash,
        metadados: validacao.metadados
      });

      toast({
        title: 'Upload concluído',
        description: `${arquivo.nome} foi enviado com sucesso`
      });

    } catch (_error) {
      console.error('âŒ Erro no upload:', _error);
      atualizarStatusArquivo(arquivo.id, 'erro', 100, 'Erro no upload do arquivo');
      
      toast({
        title: 'Erro no upload',
        description: `Falha ao enviar ${arquivo.nome}`,
        variant: 'destructive'
      });
    }
  };

  const atualizarStatusArquivo = (id: string, status: ArquivoUpload['status'], progresso: number, mensagem?: string) => {
    setArquivos(prev => prev.map(arquivo => 
      arquivo.id === id 
        ? { ...arquivo, status, progresso, mensagemValidacao: mensagem }
        : arquivo
    ));
  };

  const atualizarArquivo = (id: string, updates: Partial<ArquivoUpload>) => {
    setArquivos(prev => prev.map(arquivo => 
      arquivo.id === id ? { ...arquivo, ...updates } : arquivo
    ));
  };

  const removerArquivo = (id: string) => {
    setArquivos(prev => prev.filter(arquivo => arquivo.id !== id));
  };

  const limparTodos = () => {
    setArquivos([]);
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const filesValidos = files.filter(file => 
      acceptedTypes.some(type => file.name.toLowerCase().endsWith(type.replace('.', '')))
    );
    
    if (filesValidos.length !== files.length) {
      toast({
        title: 'Arquivos inválidos',
        description: `Apenas arquivos ${acceptedTypes.join(', ')} são permitidos`,
        variant: 'destructive'
      });
    }
    
    if (filesValidos.length > 0) {
      void processarArquivos(filesValidos);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      void processarArquivos(files);
    }
  };

  const getStatusIcon = (status: ArquivoUpload['status']) => {
    switch (status) {
      case 'pendente': return <FileText className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />;
      case 'validando': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'aprovado': return <Shield className="h-4 w-4 text-green-500" />;
      case 'rejeitado': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'enviando': return <Upload className="h-4 w-4 text-blue-500" />;
      case 'concluido': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'erro': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <FileText className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />;
    }
  };

  const getStatusColor = (status: ArquivoUpload['status']) => {
    switch (status) {
      case 'pendente': return 'bg-slate-500/15 text-slate-200 border border-slate-400/30';
      case 'validando': return 'bg-blue-100 text-blue-800';
      case 'aprovado': return 'bg-green-100 text-green-800';
      case 'rejeitado': return 'bg-red-100 text-red-800';
      case 'enviando': return 'bg-blue-100 text-blue-800';
      case 'concluido': return 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/30';
      case 'erro': return 'bg-red-500/15 text-red-200 border border-red-400/30';
      default: return 'bg-slate-500/15 text-slate-200 border border-slate-400/30';
    }
  };

  const formatarTamanho = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Área de Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Upload Seguro de Contratos
          </CardTitle>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Sistema enterprise com validação de segurança, detecção de malware e controle de integridade
          </p>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent)_/_0.5)]'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-4">
              Formatos aceitos: {acceptedTypes.join(', ')} â€¢ Máximo {maxFileSize}MB por arquivo
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Validação de segurança
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Detecção de malware
              </span>
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Verificação de integridade
              </span>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Lista de Arquivos */}
      {arquivos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Arquivos ({arquivos.length})</CardTitle>
              <Button onClick={limparTodos} variant="outline" size="sm">
                Limpar Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {arquivos.map((arquivo) => (
                <div key={arquivo.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(arquivo.status)}
                      <div>
                        <p className="font-medium text-[hsl(var(--foreground))]">{arquivo.nome}</p>
                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                          {formatarTamanho(arquivo.tamanho)} â€¢ {arquivo.tipo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(arquivo.status)}>
                        {arquivo.status}
                      </Badge>
                      {arquivo.status === 'concluido' && arquivo.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={arquivo.url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        onClick={() => removerArquivo(arquivo.id)}
                        variant="outline" 
                        size="sm"
                        disabled={arquivo.status === 'enviando'}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {arquivo.progresso > 0 && (
                    <div className="mb-2">
                      <Progress value={arquivo.progresso} className="h-2" />
                    </div>
                  )}

                  {arquivo.mensagemValidacao && (
                    <p className={`text-xs ${
                      arquivo.status === 'rejeitado' || arquivo.status === 'erro' 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {arquivo.mensagemValidacao}
                    </p>
                  )}

                  {arquivo.hashSeguranca && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Hash: {arquivo.hashSeguranca.substring(0, 16)}...
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadContratos;


