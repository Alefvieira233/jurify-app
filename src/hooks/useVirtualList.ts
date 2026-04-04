/**
 * @module useVirtualList
 * @description Generic virtual scrolling hook wrapping @tanstack/react-virtual.
 * Returns a parentRef for the scroll container and a virtualizer instance.
 *
 * @example
 * ```tsx
 * const { parentRef, virtualizer } = useVirtualList({ count: items.length, estimateSize: 48 });
 * ```
 */
import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface UseVirtualListOptions {
  /** Total number of items to virtualize */
  count: number;
  /** Estimated height (px) of each row */
  estimateSize: number;
  /** Number of items to render above/below the visible area (default 5) */
  overscan?: number;
}

export function useVirtualList({ count, estimateSize, overscan = 5 }: UseVirtualListOptions) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });
  return { parentRef, virtualizer };
}
