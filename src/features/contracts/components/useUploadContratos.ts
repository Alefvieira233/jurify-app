import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/utils/validation';
import { createLogger } from '@/lib/logger';

const log = createLogger('UploadContratos');

export interface ArquivoMetadados {
  paginas?: number;
  dataUltimaModificacao?: string;
  versao?: string;
  tipoContrato?: string;
  classificacaoSeguranca?: string;
  tamanhoBytes?: number;
  tipoMime?: string;
  nome?: string;
}

export interface ArquivoUpload {
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

export interface UploadContratosProps {
  onUploadComplete?: (arquivos: ArquivoUpload[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

/* ── Security validation helpers ── */

function verificarMagicNumber(bytes: Uint8Array, mimeType: string): boolean {
  const magicNumbers: Record<string, number[][]> = {
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
    'application/msword': [[0xD0, 0xCF, 0x11, 0xE0]],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [[0x50, 0x4B, 0x03, 0x04]],
    'text/plain': [[0x00, 0x00, 0x00, 0x00]],
  };

  const expectedMagic = magicNumbers[mimeType];
  if (!expectedMagic) return false;

  return expectedMagic.some(magic =>
    magic.every((byte, index) => bytes[index] === byte || byte === 0x00)
  );
}

function verificarExtensaoTipo(fileName: string, mimeType: string): boolean {
  const extensao = fileName.split('.').pop()?.toLowerCase();
  const tiposPermitidos: Record<string, string[]> = {
    'pdf': ['application/pdf'],
    'doc': ['application/msword'],
    'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'txt': ['text/plain'],
  };
  return extensao ? tiposPermitidos[extensao]?.includes(mimeType) || false : false;
}

function detectarConteudoSuspeito(bytes: Uint8Array): boolean {
  const padroesProibidos = [
    [0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74],
    [0x6A, 0x61, 0x76, 0x61, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74],
    [0x4D, 0x5A],
    [0x7F, 0x45, 0x4C, 0x46],
  ];
  return padroesProibidos.some(padrao =>
    bytes.some((_, index) =>
      padrao.every((byte, offset) => bytes[index + offset] === byte)
    )
  );
}

function extrairMetadados(file: File): ArquivoMetadados {
  return {
    dataUltimaModificacao: new Date(file.lastModified).toISOString(),
    tamanhoBytes: file.size,
    tipoMime: file.type,
    nome: sanitizeText(file.name),
  };
}

async function gerarHashSeguranca(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function validarSegurancaArquivo(
  file: File,
  maxFileSize: number
): Promise<{ aprovado: boolean; mensagem: string; metadados: ArquivoMetadados }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);

        const validacoes = {
          magicNumber: verificarMagicNumber(bytes, file.type),
          tamanhoSuspeito: file.size > maxFileSize * 1024 * 1024,
          extensaoValida: verificarExtensaoTipo(file.name, file.type),
          conteudoSuspeito: detectarConteudoSuspeito(bytes),
          metadados: extrairMetadados(file),
        };

        const aprovado =
          validacoes.magicNumber &&
          !validacoes.tamanhoSuspeito &&
          validacoes.extensaoValida &&
          !validacoes.conteudoSuspeito;

        let mensagem = '';
        if (!aprovado) {
          if (!validacoes.magicNumber) mensagem += 'Tipo de arquivo invalido. ';
          if (validacoes.tamanhoSuspeito) mensagem += `Arquivo muito grande (max ${maxFileSize}MB). `;
          if (!validacoes.extensaoValida) mensagem += 'Extensao nao corresponde ao tipo. ';
          if (validacoes.conteudoSuspeito) mensagem += 'Conteudo suspeito detectado. ';
        } else {
          mensagem = 'Arquivo validado com sucesso';
        }

        resolve({ aprovado, mensagem: mensagem.trim(), metadados: validacoes.metadados });
      } catch (_error) {
        resolve({ aprovado: false, mensagem: 'Erro na validacao de seguranca', metadados: {} });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/* ── Hook ── */

export function useUploadContratos({
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 50,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt'],
}: UploadContratosProps) {
  const [arquivos, setArquivos] = useState<ArquivoUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const atualizarStatusArquivo = (
    id: string,
    status: ArquivoUpload['status'],
    progresso: number,
    mensagem?: string
  ) => {
    setArquivos(prev =>
      prev.map(arquivo =>
        arquivo.id === id
          ? { ...arquivo, status, progresso, mensagemValidacao: mensagem }
          : arquivo
      )
    );
  };

  const atualizarArquivo = (id: string, updates: Partial<ArquivoUpload>) => {
    setArquivos(prev =>
      prev.map(arquivo => (arquivo.id === id ? { ...arquivo, ...updates } : arquivo))
    );
  };

  const processarArquivoIndividual = async (arquivo: ArquivoUpload) => {
    try {
      atualizarStatusArquivo(arquivo.id, 'validando', 10);
      const validacao = await validarSegurancaArquivo(arquivo.file, maxFileSize);

      if (!validacao.aprovado) {
        atualizarStatusArquivo(arquivo.id, 'rejeitado', 100, validacao.mensagem);
        return;
      }

      atualizarStatusArquivo(arquivo.id, 'aprovado', 30, validacao.mensagem);

      const hash = await gerarHashSeguranca(arquivo.file);

      atualizarStatusArquivo(arquivo.id, 'enviando', 50);

      const nomeArquivoSeguro = `${profile!.tenant_id}/${Date.now()}-${sanitizeText(arquivo.file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from('contratos')
        .upload(nomeArquivoSeguro, arquivo.file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('contratos')
        .getPublicUrl(nomeArquivoSeguro);

      atualizarStatusArquivo(arquivo.id, 'enviando', 80);

      const { error: dbError } = await supabase.from('contratos_uploads').insert({
        tenant_id: profile!.tenant_id,
        nome_arquivo: arquivo.nome,
        caminho_storage: nomeArquivoSeguro,
        url_publica: urlData.publicUrl,
        tamanho_bytes: arquivo.tamanho,
        tipo_mime: arquivo.tipo,
        hash_seguranca: hash,
        metadados: validacao.metadados,
        usuario_upload: user!.id,
      });

      if (dbError) throw dbError;

      atualizarArquivo(arquivo.id, {
        status: 'concluido',
        progresso: 100,
        url: urlData.publicUrl,
        hashSeguranca: hash,
        metadados: validacao.metadados,
      });

      toast({ title: 'Upload concluido', description: `${arquivo.nome} foi enviado com sucesso` });
    } catch (_error) {
      log.error('Erro no upload', _error);
      atualizarStatusArquivo(arquivo.id, 'erro', 100, 'Erro no upload do arquivo');
      toast({
        title: 'Erro no upload',
        description: `Falha ao enviar ${arquivo.nome}`,
        variant: 'destructive',
      });
    }
  };

  const processarArquivos = async (files: File[]) => {
    if (!user || !profile?.tenant_id) {
      toast({ title: 'Erro de autenticacao', description: 'Usuario nao autenticado', variant: 'destructive' });
      return;
    }

    if (arquivos.length + files.length > maxFiles) {
      toast({
        title: 'Limite excedido',
        description: `Maximo ${maxFiles} arquivos permitidos`,
        variant: 'destructive',
      });
      return;
    }

    const novosArquivos: ArquivoUpload[] = files.map((file, index) => ({
      id: `upload-${Date.now()}-${index}`,
      file,
      nome: sanitizeText(file.name),
      tamanho: file.size,
      tipo: file.type,
      status: 'pendente' as const,
      progresso: 0,
    }));

    setArquivos(prev => [...prev, ...novosArquivos]);

    for (const arquivo of novosArquivos) {
      await processarArquivoIndividual(arquivo);
    }

    onUploadComplete?.(novosArquivos);
  };

  const removerArquivo = (id: string) => {
    setArquivos(prev => prev.filter(arquivo => arquivo.id !== id));
  };

  const limparTodos = () => {
    setArquivos([]);
  };

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
        title: 'Arquivos invalidos',
        description: `Apenas arquivos ${acceptedTypes.join(', ')} sao permitidos`,
        variant: 'destructive',
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

  return {
    arquivos,
    isDragging,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removerArquivo,
    limparTodos,
    acceptedTypes,
    maxFileSize,
  };
}
