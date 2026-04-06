import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
const mockUseDocumentosJuridicos = vi.fn();
vi.mock('@/hooks/useDocumentosJuridicos', () => ({
  useDocumentosJuridicos: (opts: unknown) => mockUseDocumentosJuridicos(opts),
}));

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (val: string) => val,
}));

vi.mock('@/hooks/useRBAC', () => ({
  useRBAC: () => ({ can: () => true }),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('@/components/EmptyState', () => ({
  default: ({ title, description }: { title: string; description?: string }) =>
    React.createElement('div', { 'data-testid': 'empty-state' },
      React.createElement('span', null, title),
      description && React.createElement('p', null, description),
    ),
}));

vi.mock('@/components/ErrorState', () => ({
  default: ({ title, message }: { title: string; message?: string }) =>
    React.createElement('div', { 'data-testid': 'error-state' },
      React.createElement('span', null, title),
      message && React.createElement('p', null, message),
    ),
}));

vi.mock('@/components/PaginationControls', () => ({
  default: () => React.createElement('div', { 'data-testid': 'pagination' }),
}));

vi.mock('../components/UploadDocumentoForm', () => ({
  default: () => React.createElement('div', { 'data-testid': 'upload-form' }, 'Upload Form'),
}));

import DocumentosManager from '../DocumentosManager';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MemoryRouter, null, children),
    );
}

const mockDocumentos = [
  {
    id: 'doc-1',
    nome_original: 'contrato-servicos.pdf',
    tipo_documento: 'contrato',
    tipo_mime: 'application/pdf',
    tamanho_bytes: 2048000,
    descricao: 'Contrato de servicos advocaticios',
    storage_path: 'docs/contrato-servicos.pdf',
    signedUrl: 'https://example.com/signed-url-1',
    created_at: '2026-04-01T10:00:00Z',
    tenant_id: 'tenant-1',
  },
  {
    id: 'doc-2',
    nome_original: 'peticao-inicial.docx',
    tipo_documento: 'peticao',
    tipo_mime: 'application/vnd.openxmlformats',
    tamanho_bytes: 512000,
    descricao: null,
    storage_path: 'docs/peticao-inicial.docx',
    signedUrl: 'https://example.com/signed-url-2',
    created_at: '2026-04-02T14:30:00Z',
    tenant_id: 'tenant-1',
  },
];

describe('DocumentosManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton when loading', () => {
    mockUseDocumentosJuridicos.mockReturnValue({
      documentos: [],
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
      loading: true,
      error: null,
      isEmpty: false,
      fetchDocumentos: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
    });

    render(<DocumentosManager />, { wrapper: createWrapper() });

    expect(screen.getByText(/Documentos Jur/)).toBeInTheDocument();
  });

  it('renders error state on failure', () => {
    mockUseDocumentosJuridicos.mockReturnValue({
      documentos: [],
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
      loading: false,
      error: 'Falha de rede',
      isEmpty: false,
      fetchDocumentos: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
    });

    render(<DocumentosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('error-state')).toHaveTextContent('Erro ao carregar documentos');
  });

  it('renders empty state when no documents exist', () => {
    mockUseDocumentosJuridicos.mockReturnValue({
      documentos: [],
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
      loading: false,
      error: null,
      isEmpty: true,
      fetchDocumentos: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
    });

    render(<DocumentosManager />, { wrapper: createWrapper() });

    expect(screen.getByTestId('empty-state')).toHaveTextContent('Nenhum Documento');
  });

  it('renders document list with correct data', () => {
    mockUseDocumentosJuridicos.mockReturnValue({
      documentos: mockDocumentos,
      totalCount: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      loading: false,
      error: null,
      isEmpty: false,
      fetchDocumentos: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
    });

    render(<DocumentosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('contrato-servicos.pdf')).toBeInTheDocument();
    expect(screen.getByText('peticao-inicial.docx')).toBeInTheDocument();
    expect(screen.getByText('Contrato')).toBeInTheDocument();
  });

  it('displays Upload Documento button when user has permission', () => {
    mockUseDocumentosJuridicos.mockReturnValue({
      documentos: mockDocumentos,
      totalCount: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      loading: false,
      error: null,
      isEmpty: false,
      fetchDocumentos: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
    });

    render(<DocumentosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('Upload Documento')).toBeInTheDocument();
  });

  it('displays document count', () => {
    mockUseDocumentosJuridicos.mockReturnValue({
      documentos: mockDocumentos,
      totalCount: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
      loading: false,
      error: null,
      isEmpty: false,
      fetchDocumentos: vi.fn(),
      uploadDocumento: vi.fn(),
      deleteDocumento: vi.fn(),
    });

    render(<DocumentosManager />, { wrapper: createWrapper() });

    expect(screen.getByText('2 documentos')).toBeInTheDocument();
  });
});
