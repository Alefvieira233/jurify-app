import React from 'react';
import { Upload, Shield, CheckCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FileDropZoneProps {
  isDragging: boolean;
  acceptedTypes: string[];
  maxFileSize: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  isDragging,
  acceptedTypes,
  maxFileSize,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Upload Seguro de Contratos
        </CardTitle>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Sistema enterprise com validacao de seguranca, deteccao de malware e controle de integridade
        </p>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            ${isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-[hsl(var(--border))] hover:border-[hsl(var(--accent)_/_0.5)]'
            }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-12 w-12 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
            Arraste arquivos aqui ou clique para selecionar
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">
            Formatos aceitos: {acceptedTypes.join(', ')} &bull; Maximo {maxFileSize}MB por arquivo
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Validacao de seguranca
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Deteccao de malware
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Verificacao de integridade
            </span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={onFileSelect}
          className="hidden"
          aria-label="Upload de contratos"
        />
      </CardContent>
    </Card>
  );
};
