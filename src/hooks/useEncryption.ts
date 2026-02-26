/**
 * useEncryption — Hook para criptografia LGPD de campos sensíveis
 * 
 * Usa as Edge Functions encrypt-data/decrypt-data existentes.
 * Campos protegidos: CPF, CNPJ, detalhes_caso
 */

import { useCallback } from 'react';
import { supabaseUntyped as supabase } from '@/integrations/supabase/client';

const SENSITIVE_FIELDS = ['cpf', 'cnpj', 'cpf_cnpj', 'detalhes_caso', 'rg', 'telefone_pessoal'] as const;

type SensitiveField = typeof SENSITIVE_FIELDS[number];

export function useEncryption() {
  const encrypt = useCallback(async (plaintext: string): Promise<string> => {
    if (!plaintext) return '';

    const { data, error } = await supabase.functions.invoke<{ ciphertext: string }>(
      'encrypt-data',
      { body: { plaintext } }
    );

    if (error || !data?.ciphertext) {
      throw new Error(`Encryption failed: ${error?.message || 'No ciphertext returned'}`);
    }

    return data.ciphertext;
  }, []);

  const decrypt = useCallback(async (ciphertext: string): Promise<string> => {
    if (!ciphertext) return '';

    const { data, error } = await supabase.functions.invoke<{ plaintext: string }>(
      'decrypt-data',
      { body: { ciphertext } }
    );

    if (error || !data?.plaintext) {
      throw new Error(`Decryption failed: ${error?.message || 'No plaintext returned'}`);
    }

    return data.plaintext;
  }, []);

  const encryptSensitiveFields = useCallback(async <T extends Record<string, unknown>>(
    data: T
  ): Promise<T> => {
    const result = { ...data };

    for (const field of SENSITIVE_FIELDS) {
      if (field in result && typeof result[field] === 'string' && result[field]) {
        try {
          (result as Record<string, unknown>)[`${field}_encrypted`] = await encrypt(result[field]);
          (result as Record<string, unknown>)[field] = '***ENCRYPTED***';
        } catch {
          // Non-blocking: keep original if encryption fails
        }
      }
    }

    return result;
  }, [encrypt]);

  const decryptSensitiveFields = useCallback(async <T extends Record<string, unknown>>(
    data: T
  ): Promise<T> => {
    const result = { ...data };

    for (const field of SENSITIVE_FIELDS) {
      const encField = `${field}_encrypted`;
      if (encField in result && typeof result[encField] === 'string' && result[encField]) {
        try {
          (result as Record<string, unknown>)[field] = await decrypt(result[encField]);
        } catch {
          (result as Record<string, unknown>)[field] = '[ERRO DECRIPTAÇÃO]';
        }
      }
    }

    return result;
  }, [decrypt]);

  const isSensitiveField = useCallback((fieldName: string): boolean => {
    return SENSITIVE_FIELDS.includes(fieldName as SensitiveField);
  }, []);

  return {
    encrypt,
    decrypt,
    encryptSensitiveFields,
    decryptSensitiveFields,
    isSensitiveField,
    SENSITIVE_FIELDS,
  };
}
