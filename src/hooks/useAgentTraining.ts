import { useState, useEffect, useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createLogger } from '@/lib/logger';

const log = createLogger('AgentTraining');

export interface TrainingDocument {
  id: string;
  tenant_id: string;
  uploaded_by: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string | null;
  status: 'uploading' | 'extracting' | 'embedding' | 'ready' | 'error';
  error_message: string | null;
  chunks_count: number;
  extracted_text_preview: string | null;
  created_at: string;
  updated_at: string;
}

export const useAgentTraining = () => {
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const tenantId = profile?.tenant_id;

  // Fetch training documents
  const fetchDocuments = useCallback(async () => {
    if (!user || !tenantId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agent_training_documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as TrainingDocument[]);
    } catch (err) {
      log.error('Erro ao carregar documentos de treinamento', err);
    } finally {
      setLoading(false);
    }
  }, [user, tenantId]);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  // Upload and process a training document
  const uploadDocument = useCallback(async (file: File): Promise<boolean> => {
    if (!user || !tenantId) return false;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 10MB.',
        variant: 'destructive',
      });
      return false;
    }

    const allowedTypes = ['application/pdf', 'text/plain', 'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.txt', '.csv', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      toast({
        title: 'Formato não suportado',
        description: 'Formatos aceitos: PDF, DOCX, TXT, CSV.',
        variant: 'destructive',
      });
      return false;
    }

    setUploading(true);

    try {
      // 1. Create tracking record
      const { data: docRecord, error: insertError } = await supabase
        .from('agent_training_documents')
        .insert({
          tenant_id: tenantId,
          uploaded_by: user.id,
          file_name: file.name,
          file_type: ext.replace('.', ''),
          file_size_bytes: file.size,
          status: 'uploading',
        })
        .select()
        .single();

      if (insertError || !docRecord) throw insertError || new Error('Falha ao criar registro');

      const docId = (docRecord as TrainingDocument).id;

      // Add to local state immediately (optimistic)
      setDocuments(prev => [docRecord as TrainingDocument, ...prev]);

      // 2. Upload to Supabase Storage
      const storagePath = `training/${tenantId}/${docId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file);

      if (uploadError) {
        await updateDocStatus(docId, 'error', `Upload falhou: ${uploadError.message}`);
        throw uploadError;
      }

      // Update storage path
      await supabase
        .from('agent_training_documents')
        .update({ storage_path: storagePath, status: 'extracting' })
        .eq('id', docId);

      updateLocalDoc(docId, { storage_path: storagePath, status: 'extracting' });

      // 3. Convert file to base64 for extraction
      const base64 = await fileToBase64(file);

      // 4. Extract text via existing Edge Function
      const { data: extractResult, error: extractError } = await supabase.functions.invoke(
        'extract-document-text',
        {
          body: {
            base64,
            filename: file.name,
            content_type: file.type,
            tenant_id: tenantId,
          },
        }
      );

      if (extractError || !extractResult?.text) {
        const errMsg = extractError?.message || 'Não foi possível extrair texto do documento';
        await updateDocStatus(docId, 'error', errMsg);
        throw new Error(errMsg);
      }

      const extractedText = extractResult.text as string;
      const preview = extractedText.substring(0, 500);

      // Update status to embedding
      await supabase
        .from('agent_training_documents')
        .update({ status: 'embedding', extracted_text_preview: preview })
        .eq('id', docId);

      updateLocalDoc(docId, { status: 'embedding', extracted_text_preview: preview });

      // 5. Ingest into vector store via existing Edge Function
      const { data: ingestResult, error: ingestError } = await supabase.functions.invoke(
        'ingest-document',
        {
          body: {
            text: extractedText,
            tenant_id: tenantId,
            doc_id: docId,
            source: `training:${file.name}`,
            metadata: {
              training_document_id: docId,
              file_name: file.name,
              file_type: ext.replace('.', ''),
              uploaded_by: user.id,
            },
          },
        }
      );

      if (ingestError) {
        const errMsg = ingestError.message || 'Falha ao gerar embeddings';
        await updateDocStatus(docId, 'error', errMsg);
        throw new Error(errMsg);
      }

      const chunksCount = (ingestResult as { chunks?: number })?.chunks || 0;

      // 6. Mark as ready
      await supabase
        .from('agent_training_documents')
        .update({ status: 'ready', chunks_count: chunksCount })
        .eq('id', docId);

      updateLocalDoc(docId, { status: 'ready', chunks_count: chunksCount });

      toast({
        title: 'Documento processado',
        description: `"${file.name}" foi indexado com ${chunksCount} segmentos. A IA já pode usar esse conhecimento.`,
      });

      log.info(`Documento ${file.name} processado: ${chunksCount} chunks`);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar documento';
      log.error('Erro no upload de treinamento', err);
      toast({
        title: 'Erro ao processar documento',
        description: message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setUploading(false);
    }
  }, [user, tenantId, toast, updateDocStatus, updateLocalDoc]);

  // Delete a training document and its embeddings
  const deleteDocument = useCallback(async (docId: string): Promise<boolean> => {
    if (!user || !tenantId) return false;

    try {
      const doc = documents.find(d => d.id === docId);

      // 1. Delete embeddings from documents table (via doc_id in metadata)
      const { error: embeddingError } = await supabase
        .from('documents')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('metadata->>doc_id', docId);

      if (embeddingError) {
        log.error('Erro ao deletar embeddings', embeddingError);
      }

      // 2. Delete from storage
      if (doc?.storage_path) {
        await supabase.storage.from('documents').remove([doc.storage_path]);
      }

      // 3. Delete tracking record
      const { error: deleteError } = await supabase
        .from('agent_training_documents')
        .delete()
        .eq('id', docId)
        .eq('tenant_id', tenantId);

      if (deleteError) throw deleteError;

      setDocuments(prev => prev.filter(d => d.id !== docId));

      toast({
        title: 'Documento removido',
        description: `"${doc?.file_name || 'Documento'}" e seus embeddings foram removidos da base de conhecimento.`,
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao remover documento';
      log.error('Erro ao deletar documento de treinamento', err);
      toast({
        title: 'Erro ao remover',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  }, [user, tenantId, documents, toast]);

  // Retry a failed document
  const retryDocument = useCallback(async (docId: string): Promise<boolean> => {
    const doc = documents.find(d => d.id === docId);
    if (!doc?.storage_path || !tenantId) return false;

    try {
      // Re-download from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);

      if (downloadError || !fileData) throw downloadError || new Error('Download falhou');

      const file = new File([fileData], doc.file_name, { type: `application/${doc.file_type}` });

      // Delete old embeddings
      await supabase
        .from('documents')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('metadata->>doc_id', docId);

      // Reset status
      await updateDocStatus(docId, 'extracting', null);

      // Re-process
      const base64 = await fileToBase64(file);

      const { data: extractResult, error: extractError } = await supabase.functions.invoke(
        'extract-document-text',
        { body: { base64, filename: doc.file_name, content_type: file.type, tenant_id: tenantId } }
      );

      if (extractError || !extractResult?.text) {
        await updateDocStatus(docId, 'error', 'Falha na extração de texto');
        return false;
      }

      await updateDocStatus(docId, 'embedding', null);

      const { data: ingestResult, error: ingestError } = await supabase.functions.invoke(
        'ingest-document',
        {
          body: {
            text: extractResult.text,
            tenant_id: tenantId,
            doc_id: docId,
            source: `training:${doc.file_name}`,
            metadata: { training_document_id: docId, file_name: doc.file_name },
          },
        }
      );

      if (ingestError) {
        await updateDocStatus(docId, 'error', 'Falha ao gerar embeddings');
        return false;
      }

      const chunksCount = (ingestResult as { chunks?: number })?.chunks || 0;
      await supabase
        .from('agent_training_documents')
        .update({ status: 'ready', chunks_count: chunksCount, error_message: null })
        .eq('id', docId);

      updateLocalDoc(docId, { status: 'ready', chunks_count: chunksCount, error_message: null });

      toast({ title: 'Documento reprocessado', description: `${chunksCount} segmentos indexados.` });
      return true;
    } catch (err) {
      log.error('Erro ao reprocessar documento', err);
      return false;
    }
  }, [documents, tenantId, toast, updateDocStatus, updateLocalDoc]);

  // Helpers — stable references (no deps needed)
  const updateLocalDoc = useCallback((docId: string, updates: Partial<TrainingDocument>) => {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, ...updates } : d));
  }, []);

  const updateDocStatus = useCallback(async (docId: string, status: string, errorMessage: string | null) => {
    await supabase
      .from('agent_training_documents')
      .update({ status, error_message: errorMessage })
      .eq('id', docId);

    updateLocalDoc(docId, { status, error_message: errorMessage } as Partial<TrainingDocument>);
  }, [updateLocalDoc]);

  const stats = {
    total: documents.length,
    ready: documents.filter(d => d.status === 'ready').length,
    processing: documents.filter(d => ['uploading', 'extracting', 'embedding'].includes(d.status)).length,
    error: documents.filter(d => d.status === 'error').length,
    totalChunks: documents.reduce((acc, d) => acc + (d.chunks_count || 0), 0),
  };

  return {
    documents,
    loading,
    uploading,
    stats,
    uploadDocument,
    deleteDocument,
    retryDocument,
    fetchDocuments,
  };
};

// File to base64 utility
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
