import { useCallback, useRef } from 'react';

/**
 * Provides keyboard navigation for table rows.
 *
 * - Arrow Up / Arrow Down: move focus between rows
 * - Enter / Space: activate the row (same as click)
 *
 * Usage:
 *   const { getRowProps } = useTableKeyboardNav({ onActivate: (index) => handleRowClick(items[index]) });
 *   // then in JSX: <TableRow {...getRowProps(index)}>
 */
export function useTableKeyboardNav({
  onActivate,
  itemCount,
}: {
  /** Called when a row is activated (Enter/Space). Receives the row index. */
  onActivate: (index: number) => void;
  /** Total number of navigable rows */
  itemCount: number;
}) {
  const containerRef = useRef<HTMLTableSectionElement | null>(null);

  const focusRow = useCallback((index: number) => {
    if (!containerRef.current) return;
    const rows = containerRef.current.querySelectorAll<HTMLElement>('[data-row-index]');
    const target = Array.from(rows).find(
      (el) => el.getAttribute('data-row-index') === String(index),
    );
    target?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLTableRowElement>) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          if (index < itemCount - 1) focusRow(index + 1);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          if (index > 0) focusRow(index - 1);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          onActivate(index);
          break;
        }
        // No default — let other keys propagate normally
      }
    },
    [itemCount, focusRow, onActivate],
  );

  const getRowProps = useCallback(
    (index: number) => ({
      tabIndex: 0,
      role: 'row' as const,
      'data-row-index': index,
      'aria-rowindex': index + 1,
      onKeyDown: (e: React.KeyboardEvent<HTMLTableRowElement>) => handleKeyDown(index, e),
    }),
    [handleKeyDown],
  );

  return { containerRef, getRowProps };
}
