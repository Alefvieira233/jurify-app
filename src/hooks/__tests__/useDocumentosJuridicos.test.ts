import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocumentosJuridicos } from '../useDocumentosJuridicos';

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockDocumentos = [
  {
    id: 'd1',
    tenant_id: 'tenant-1',
    processo_id: 'p1',
    lead_id: 'l1',
    nome_arquivo: 'peticao_inicial.pdf',
    nome_original: 'Petição Inicial.pdf',
    storage_path: 'tenant-1/d1/peticao_inicial.pdf',
    url_publica: null,
    tipo_documento: 'peticao',
    content_hash: 'abc123',
    hash_algorithm: 'SHA-256',
    tipo_mime: 'application/pdf',
    tamanho_bytes: 102400,
    uploaded_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: null,
  },
  {
    id: 'd2',
    tenant_id: 'tenant-1',
    processo_id: 'p1',
    lead_id: 'l1',
    nome_arquivo: 'contrato.pdf',
    nome_original: 'Contrato Assinado.pdf',
    storage_path: 'tenant-1/d2/contrato.pdf',
    url_publica: null,
    tipo_documento: 'contrato',
    content_hash: 'def456',
    hash_algorithm: 'SHA-256',
    tipo_mime: 'application/pdf',
    tamanho_bytes: 51200,
    uploaded_by: 'user-1',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: null,
  },
];

const mockSignedUrls = [
  { path: 'tenant-1/d1/peticao_inicial.pdf', signedUrl: 'https://storage.example.com/signed/d1', error: null },
  { path: 'tenant-1/d2/contrato.pdf', signedUrl: 'https://storage.example.com/signed/d2', error: null },
];

function createChainableQuery(data: unknown = mockDocumentos, error: unknown = null) {
  const result = { data, error, count: Array.isArray(data) ? (data as unknown[]).length : 0 };
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') {
        return (onRejected?: (e: unknown) => unknown) =>
          Promise.resolve(result).catch(onRejected);
      }
      return (..._args: unknown[]) => new Proxy({}, handler);
    },
  };
  return new Proxy({}, handler);
}

vi.mock('@/integrations/supabase/client', () => {
  const client = {
    from: () => createChainableQuery(),
    storage: {
      from: () => ({
        createSignedUrls: () => Promise.resolve({ data: [
          { path: 'tenant-1/d1/peticao_inicial.pdf', signedUrl: 'https://storage.example.com/signed/d1', error: null },
          { path: 'tenant-1/d2/contrato.pdf', signedUrl: 'https://storage.example.com/signed/d2', error: null },
        ], error: null }),
        upload: () => Promise.resolve({ data: null, error: null }),
        remove: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  };
  return { supabase: client, supabaseUntyped: client };
});

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@test.com', user_metadata: {} },
    profile: { id: 'test-user-id', tenant_id: 'tenant-1', role: 'admin' },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/lib/sentry', () => ({ addSentryBreadcrumb: vi.fn() }));

describe('useDocumentosJuridicos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('should fetch documentos on mount', async () => {
    const { result } = renderHook(() => useDocumentosJuridicos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.documentos).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('should return documentos with correct shape', async () => {
    const { result } = renderHook(() => useDocumentosJuridicos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.documentos).toHaveLength(2); });

    const first = result.current.documentos[0];
    expect(first).toHaveProperty('id', 'd1');
    expect(first).toHaveProperty('nome_arquivo');
    expect(first).toHaveProperty('nome_original');
    expect(first).toHaveProperty('storage_path');
    expect(first).toHaveProperty('tipo_documento');
    expect(first).toHaveProperty('tamanho_bytes');
    expect(first).toHaveProperty('tenant_id', 'tenant-1');
  });

  it('should include signedUrl from batch createSignedUrls', async () => {
    const { result } = renderHook(() => useDocumentosJuridicos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.documentos).toHaveLength(2); });

    // Signed URLs should be resolved from the batch call
    const first = result.current.documentos[0];
    expect(first).toHaveProperty('signedUrl');
  });

  it('should expose upload and delete functions', async () => {
    const { result } = renderHook(() => useDocumentosJuridicos(), { wrapper: createWrapper() });

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(typeof result.current.uploadDocumento).toBe('function');
    expect(typeof result.current.deleteDocumento).toBe('function');
    expect(typeof result.current.fetchDocumentos).toBe('function');
  });

  it('should support pagination state', async () => {
    const { result } = renderHook(
      () => useDocumentosJuridicos({ page: 1 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    expect(result.current.page).toBe(1);
    expect(typeof result.current.totalPages).toBe('number');
    expect(result.current.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('should filter by processoId when provided', async () => {
    const { result } = renderHook(
      () => useDocumentosJuridicos({ processoId: 'p1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => { expect(result.current.loading).toBe(false); });

    // With mock, all docs return; test that hook doesn't crash with filter option
    expect(result.current.documentos).toBeDefined();
  });
});
