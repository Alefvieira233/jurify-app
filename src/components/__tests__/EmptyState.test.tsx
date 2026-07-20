import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../EmptyState';
import { vi, describe, it, expect } from 'vitest';
import { HelpCircle } from 'lucide-react';

describe('EmptyState Component', () => {
  it('renders title correctly', () => {
    render(<EmptyState title="No items found" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('renders description correctly', () => {
    render(<EmptyState title="No items" description="Please add some items." />);
    expect(screen.getByText('Please add some items.')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = render(<EmptyState title="Title" icon={HelpCircle} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('calls action callback when action button is clicked', () => {
    const onClickMock = vi.fn();
    render(
      <EmptyState
        title="Title"
        action={{ label: 'Create New', onClick: onClickMock }}
      />
    );

    const button = screen.getByRole('button', { name: 'Create New' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
