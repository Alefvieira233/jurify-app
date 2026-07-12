import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';

// Mock components that use useFormContext
vi.mock('@/components/ui/password-strength', () => ({
  default: () => <div data-testid="password-strength" />
}));

import LoginForm from '../LoginForm';

const TestWrapper = ({ isBiometricsAvailable = false }: { isBiometricsAvailable?: boolean }) => {
  const methods = useForm({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  return (
    <MemoryRouter>
      <FormProvider {...methods}>
        <LoginForm
          form={methods}
          loading={false}
          isBiometricsAvailable={isBiometricsAvailable}
          onSubmit={vi.fn()}
          onBiometricLogin={vi.fn()}
          onSwitchToRegister={vi.fn()}
        />
      </FormProvider>
    </MemoryRouter>
  );
};

describe('LoginForm', () => {
  it('contains Terms and Privacy links with noopener noreferrer', () => {
    render(<TestWrapper />);

    const termsLink = screen.getByRole('link', { name: /termos de uso/i });
    const privacyLink = screen.getByRole('link', { name: /política de privacidade/i });

    expect(termsLink).toHaveAttribute('target', '_blank');
    expect(termsLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(privacyLink).toHaveAttribute('target', '_blank');
    expect(privacyLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders all form fields and submit button', () => {
    render(<TestWrapper />);

    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /acessar plataforma/i })).toBeInTheDocument();
  });

  it('shows biometric login button when available', () => {
    render(<TestWrapper isBiometricsAvailable={true} />);
    expect(screen.getByRole('button', { name: /entrar com biometria/i })).toBeInTheDocument();
  });
});
