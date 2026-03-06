import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageTitle } from '../usePageTitle';

describe('usePageTitle', () => {
  afterEach(() => {
    document.title = '';
  });

  it('sets document title with app name suffix', () => {
    renderHook(() => usePageTitle('Dashboard'));
    expect(document.title).toBe('Dashboard — Jurify');
  });

  it('sets only app name when title is empty', () => {
    renderHook(() => usePageTitle(''));
    expect(document.title).toBe('Jurify');
  });

  it('resets title on unmount', () => {
    const { unmount } = renderHook(() => usePageTitle('Leads'));
    expect(document.title).toBe('Leads — Jurify');
    unmount();
    expect(document.title).toBe('Jurify');
  });

  it('updates title when prop changes', () => {
    const { rerender } = renderHook(({ title }) => usePageTitle(title), {
      initialProps: { title: 'Page A' },
    });
    expect(document.title).toBe('Page A — Jurify');

    rerender({ title: 'Page B' });
    expect(document.title).toBe('Page B — Jurify');
  });
});
