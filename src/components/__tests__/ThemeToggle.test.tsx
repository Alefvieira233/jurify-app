import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from '../ThemeToggle';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    vi.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('toggles theme when button is clicked', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    // Toggles light to dark
    fireEvent.click(button);
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

    // Toggles dark to light
    fireEvent.click(button);
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });
});
