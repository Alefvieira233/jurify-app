import React from 'react';
import { X, FileText, Shield, CheckCircle, AlertTriangle, Loader2, Upload, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getStatusClasses } from '@/constants/statusConfig';
import type { ArquivoUpload } from './useUploadContratos';

interface UploadedFileCardProps {
  arquivo: ArquivoUpload;
  onRemove: (id: string) => void;
}

function getStatusIcon(status: ArquivoUpload['status']) {
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
}

function formatarTamanho(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const UploadedFileCard: React.FC<UploadedFileCardProps> = ({ arquivo, onRemove }) => {
  const statusColor = getStatusClasses('upload', arquivo.status);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon(arquivo.status)}
          <div>
            <p className="font-medium text-[hsl(var(--foreground))]">{arquivo.nome}</p>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {formatarTamanho(arquivo.tamanho)} &bull; {arquivo.tipo}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColor}>
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
            onClick={() => onRemove(arquivo.id)}
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
  );
};
