import React from 'react';
import { FileDropZone } from './FileDropZone';
import { UploadProgressList } from './UploadProgressList';
import { useUploadContratos } from './useUploadContratos';
import type { UploadContratosProps } from './useUploadContratos';

const UploadContratos: React.FC<UploadContratosProps> = ({
  onUploadComplete,
  maxFiles = 10,
  maxFileSize = 50,
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt'],
}) => {
  const {
    arquivos,
    isDragging,
    fileInputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    removerArquivo,
    limparTodos,
  } = useUploadContratos({ onUploadComplete, maxFiles, maxFileSize, acceptedTypes });

  return (
    <div className="space-y-6">
      <FileDropZone
        isDragging={isDragging}
        acceptedTypes={acceptedTypes}
        maxFileSize={maxFileSize}
        fileInputRef={fileInputRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileSelect}
      />

      <UploadProgressList
        arquivos={arquivos}
        onRemove={removerArquivo}
        onClearAll={limparTodos}
      />
    </div>
  );
};

export default UploadContratos;
