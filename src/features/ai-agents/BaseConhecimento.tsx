import { BookOpen } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import KnowledgeBaseSection from './KnowledgeBaseSection';

export default function BaseConhecimento() {
  usePageTitle('Base de Conhecimento');

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Base de Conhecimento</h1>
      </div>
      <KnowledgeBaseSection />
    </div>
  );
}
