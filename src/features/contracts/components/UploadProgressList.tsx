import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadedFileCard } from './UploadedFileCard';
import type { ArquivoUpload } from './useUploadContratos';

interface UploadProgressListProps {
  arquivos: ArquivoUpload[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

export const UploadProgressList: React.FC<UploadProgressListProps> = ({
  arquivos,
  onRemove,
  onClearAll,
}) => {
  if (arquivos.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Arquivos ({arquivos.length})</CardTitle>
          <Button onClick={onClearAll} variant="outline" size="sm">
            Limpar Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {arquivos.map((arquivo) => (
            <UploadedFileCard
              key={arquivo.id}
              arquivo={arquivo}
              onRemove={onRemove}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
