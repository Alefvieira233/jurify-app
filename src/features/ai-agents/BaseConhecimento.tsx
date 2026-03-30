import { BookOpen, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function BaseConhecimento() {
  usePageTitle('Base de Conhecimento');

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Base de Conhecimento</h1>
      </div>
      <Card className="max-w-lg mx-auto mt-12">
        <CardHeader className="text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle>Em breve</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>A base de conhecimento para documentos RAG esta em desenvolvimento.</p>
          <p className="mt-2 text-sm">Em breve voce podera fazer upload de documentos para enriquecer as respostas da IA.</p>
        </CardContent>
      </Card>
    </div>
  );
}
