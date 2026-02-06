/**
 * 🔐 DOCUMENT HASH SERVICE - Blockchain-Ready Integrity
 *
 * Gera e verifica hashes SHA-256 de documentos para garantir
 * integridade e autenticidade. Preparado para registro futuro
 * em blockchain.
 *
 * @version 1.0.0
 * @architecture Enterprise Grade
 */

import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import CryptoJS from 'crypto-js';

const log = createLogger('DocumentHash');

// 🎯 TIPOS
export type DocumentType = 'contract' | 'petition' | 'evidence' | 'power_of_attorney' | 'report' | 'other';

export interface HashRecord {
  id: string;
  tenant_id: string;
  document_type: DocumentType;
  original_filename: string;
  file_size_bytes: number;
  content_hash: string;
  hash_algorithm: string;
  storage_path: string | null;
  signed_by: string | null;
  verified_at: string | null;
  verification_count: number;
  blockchain_tx_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VerificationResult {
  verified: boolean;
  record: HashRecord | null;
  message: string;
}

// 🔐 CLASSE PRINCIPAL
export class DocumentHashService {
  private static instance: DocumentHashService;

  private constructor() {
    log.info('DocumentHash service initialized');
  }

  static getInstance(): DocumentHashService {
    if (!DocumentHashService.instance) {
      DocumentHashService.instance = new DocumentHashService();
    }
    return DocumentHashService.instance;
  }

  /**
   * 🔑 Gera hash SHA-256 de um arquivo (client-side)
   */
  async generateHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const wordArray = CryptoJS.lib.WordArray.create(reader.result as ArrayBuffer);
          const hash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
          resolve(hash);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * 📝 Registra hash de um documento no banco
   */
  async register(
    tenantId: string,
    file: File,
    documentType: DocumentType,
    options?: {
      storagePath?: string;
      signedBy?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<HashRecord | null> {
    try {
      log.debug('Generating hash for document', { filename: file.name, size: file.size });

      const contentHash = await this.generateHash(file);

      log.info('Hash generated', { hash: contentHash.substring(0, 16) + '...', filename: file.name });

      const { data, error } = await supabase
        .from('document_hashes')
        .upsert(
          {
            tenant_id: tenantId,
            document_type: documentType,
            original_filename: file.name,
            file_size_bytes: file.size,
            content_hash: contentHash,
            hash_algorithm: 'SHA-256',
            storage_path: options?.storagePath || null,
            signed_by: options?.signedBy || null,
            metadata: {
              ...options?.metadata,
              content_type: file.type,
              last_modified: file.lastModified,
              registered_at: new Date().toISOString(),
            },
          },
          { onConflict: 'tenant_id,content_hash' }
        )
        .select('*')
        .single();

      if (error) {
        log.error('Failed to register hash', error);
        return null;
      }

      log.info('Document hash registered', { id: data?.id, hash: contentHash.substring(0, 16) });
      return data as HashRecord;
    } catch (error) {
      log.error('register exception', error);
      return null;
    }
  }

  /**
   * ✅ Verifica integridade de um arquivo contra o hash registrado
   */
  async verify(tenantId: string, file: File): Promise<VerificationResult> {
    try {
      const contentHash = await this.generateHash(file);

      log.debug('Verifying document hash', { hash: contentHash.substring(0, 16) });

      const { data, error } = await supabase.rpc('verify_document_hash', {
        p_tenant_id: tenantId,
        p_content_hash: contentHash,
      });

      if (error) {
        log.error('verify RPC failed', error);
        return { verified: false, record: null, message: 'Erro ao verificar documento' };
      }

      if (data && data.length > 0) {
        const record = data[0];
        log.info('Document verified', { id: record.id, filename: record.original_filename });
        return {
          verified: true,
          record: record as HashRecord,
          message: `Documento autêntico. Registrado em ${new Date(record.created_at).toLocaleDateString('pt-BR')}.`,
        };
      }

      log.warn('Document hash not found', { hash: contentHash.substring(0, 16) });
      return {
        verified: false,
        record: null,
        message: 'Documento não encontrado no registro. O arquivo pode ter sido alterado ou não foi registrado.',
      };
    } catch (error) {
      log.error('verify exception', error);
      return { verified: false, record: null, message: 'Erro ao verificar documento' };
    }
  }

  /**
   * 📋 Lista hashes registrados por tenant
   */
  async listHashes(
    tenantId: string,
    options?: { documentType?: DocumentType; limit?: number }
  ): Promise<HashRecord[]> {
    try {
      let query = supabase
        .from('document_hashes')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (options?.documentType) {
        query = query.eq('document_type', options.documentType);
      }

      const { data, error } = await query;

      if (error) {
        log.error('listHashes failed', error);
        return [];
      }

      return (data || []) as HashRecord[];
    } catch (error) {
      log.error('listHashes exception', error);
      return [];
    }
  }

  /**
   * 📊 Estatísticas de hashes por tenant
   */
  async getStats(tenantId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    totalVerifications: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('document_hashes')
        .select('document_type, verification_count')
        .eq('tenant_id', tenantId);

      if (error || !data) {
        return { total: 0, byType: {}, totalVerifications: 0 };
      }

      const byType: Record<string, number> = {};
      let totalVerifications = 0;

      for (const row of data) {
        byType[row.document_type] = (byType[row.document_type] || 0) + 1;
        totalVerifications += row.verification_count || 0;
      }

      return { total: data.length, byType, totalVerifications };
    } catch (error) {
      log.error('getStats exception', error);
      return { total: 0, byType: {}, totalVerifications: 0 };
    }
  }
}

// 🚀 Instância singleton
export const documentHash = DocumentHashService.getInstance();
