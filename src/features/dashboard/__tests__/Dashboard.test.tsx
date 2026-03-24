import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/hooks/usePageTitle', () => ({
  usePageTitle: vi.fn(),
}));

import Dashboard from '../Dashboard';

function createWrapper() {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, null, children);
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero title', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('O que você precisa automatizar hoje?')).toBeInTheDocument();
  });

  it('renders badge subtitle', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText(/escritório trabalhando mais rápido/i)).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByPlaceholderText(/Criar Petição INSS/)).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Assistentes Práticos')).toBeInTheDocument();
    expect(screen.getByText('Meus Arquivos')).toBeInTheDocument();
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });

  it('renders all 6 AI tool cards', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Elaborar Petição Inicial (INSS)')).toBeInTheDocument();
    expect(screen.getByText('Análise de Contrato ou Acordo')).toBeInTheDocument();
    expect(screen.getByText('Assistente de Triagem de WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Pesquisa Rápida de Jurisprudência')).toBeInTheDocument();
    expect(screen.getByText('Resumo de Processo e Autos')).toBeInTheDocument();
    expect(screen.getByText('Controle de Intimações (Diários)')).toBeInTheDocument();
  });

  it('renders agent action buttons', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Criar Petição')).toBeInTheDocument();
    expect(screen.getByText('Analisar Contrato')).toBeInTheDocument();
    expect(screen.getByText('Ver Chatbot')).toBeInTheDocument();
    expect(screen.getByText('Fazer Pesquisa')).toBeInTheDocument();
    expect(screen.getByText('Resumir Autos')).toBeInTheDocument();
    expect(screen.getByText('Ver Intimações')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    const ativoBadges = screen.getAllByText('Ativo');
    expect(ativoBadges.length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('Configurar')).toBeInTheDocument();
    expect(screen.getByText('Novo')).toBeInTheDocument();
  });

  it('filters agents by search', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText(/Criar Petição INSS/);
    fireEvent.change(input, { target: { value: 'Petição' } });
    expect(screen.getByText('Elaborar Petição Inicial (INSS)')).toBeInTheDocument();
    expect(screen.queryByText('Análise de Contrato ou Acordo')).not.toBeInTheDocument();
  });

  it('shows empty state when search has no results', () => {
    render(<Dashboard />, { wrapper: createWrapper() });
    const input = screen.getByPlaceholderText(/Criar Petição INSS/);
    fireEvent.change(input, { target: { value: 'xyznonexistent' } });
    expect(screen.getByText('Nenhuma ferramenta encontrada')).toBeInTheDocument();
  });
});
