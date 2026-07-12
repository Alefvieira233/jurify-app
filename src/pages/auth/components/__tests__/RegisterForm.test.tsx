import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';

// Mock components that use useFormContext
vi.mock('@/components/ui/password-strength', () => ({
  default: () => <div data-testid="password-strength" />
}));

import RegisterForm from '../RegisterForm';

const TestWrapper = () => {
  const methods = useForm({
    defaultValues: {
      nomeCompleto: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  return (
    <MemoryRouter>
      <FormProvider {...methods}>
        <RegisterForm
          form={methods}
          lgpdConsent={false}
          loading={false}
          onLgpdConsentChange={vi.fn()}
          onSubmit={vi.fn()}
          onSwitchToLogin={vi.fn()}
        />
      </FormProvider>
    </MemoryRouter>
  );
};

describe('RegisterForm', () => {
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

    expect(screen.getByTestId('name-input')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
    expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /começar agora/i })).toBeInTheDocument();
  });
});
