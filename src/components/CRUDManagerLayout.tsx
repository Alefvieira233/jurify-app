import { useState, useMemo, useCallback, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageTitle } from '@/hooks/usePageTitle';
import ConfirmDialog from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import PaginationControls from '@/components/PaginationControls';
import { ScreenReaderAnnounce } from '@/components/ui/ScreenReaderAnnounce';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeleteState {
  open: boolean;
  id: string;
  label: string;
}

interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onPrev: () => void;
  onNext: () => void;
  label?: string;
}

interface EmptyStateConfig {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface DeleteConfig {
  title: string;
  description: string | ((label: string) => string);
  onConfirm: (id: string) => void | Promise<void>;
}

interface SkeletonConfig {
  /** Number of skeleton cards to show (default: 3) */
  count?: number;
  /** Height class for each skeleton (default: "h-48") */
  height?: string;
  /** Grid columns class (default: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3") */
  gridCols?: string;
}

export interface CRUDManagerLayoutProps<T> {
  /** Page title for the browser tab */
  pageTitle: string;

  /** Items to display */
  items: T[];

  /** Loading state */
  isLoading: boolean;

  /** Error message string, or null/undefined if no error */
  error?: string | null;

  /** Called when the user clicks "retry" on the error state */
  onRetry?: () => void;

  /** Whether the data set is completely empty (no items even without filters) */
  isEmpty?: boolean;

  /** Config for the empty state when isEmpty is true */
  emptyStateProps?: EmptyStateConfig;

  // ── Search ────────────────────────────────────────────────────────────────

  /** Placeholder text for the search input */
  searchPlaceholder?: string;

  /** Debounce delay in ms (default: 300) */
  searchDebounceMs?: number;

  /** Client-side filter function. If provided, items are filtered by the debounced search term. */
  filterFn?: (item: T, debouncedSearch: string) => boolean;

  // ── Rendering ─────────────────────────────────────────────────────────────

  /** Renders the header section (title, description, action buttons). Receives debouncedSearch. */
  renderHeader?: (ctx: RenderContext<T>) => ReactNode;

  /** Renders additional filter controls (status selects, etc.) next to the search bar */
  renderFilters?: (ctx: RenderContext<T>) => ReactNode;

  /** Renders the list/grid of items. Required. */
  renderItems: (items: T[], ctx: RenderContext<T>) => ReactNode;

  /** Optional: custom loading skeleton. If not provided, a default grid of Skeleton cards is shown. */
  renderLoading?: () => ReactNode;

  /** Optional: render content shown when filters produce 0 results (but data isn't truly empty) */
  renderNoResults?: (ctx: RenderContext<T>) => ReactNode;

  /** Optional: extra content rendered after the item list (stats panels, etc.) */
  renderExtra?: (ctx: RenderContext<T>) => ReactNode;

  // ── Skeleton ──────────────────────────────────────────────────────────────

  /** Configuration for the default loading skeleton */
  skeletonConfig?: SkeletonConfig;

  // ── Delete ────────────────────────────────────────────────────────────────

  /** If provided, the layout manages a confirm-delete dialog */
  deleteConfig?: DeleteConfig;

  // ── Pagination ────────────────────────────────────────────────────────────

  /** If provided, pagination controls are rendered after the list */
  pagination?: PaginationConfig;

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Wrapper className (default: "p-6 space-y-6") */
  className?: string;
}

/** Context object passed to render props, providing search state and delete helpers */
export interface RenderContext<T> {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  debouncedSearch: string;
  filteredItems: T[];
  requestDelete: (id: string, label: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CRUDManagerLayout<T>({
  pageTitle,
  items,
  isLoading,
  error,
  onRetry,
  isEmpty,
  emptyStateProps,
  searchPlaceholder = 'Buscar...',
  searchDebounceMs = 300,
  filterFn,
  renderHeader,
  renderFilters,
  renderItems,
  renderLoading,
  renderNoResults,
  renderExtra,
  skeletonConfig,
  deleteConfig,
  pagination,
  className = 'p-6 space-y-6',
}: CRUDManagerLayoutProps<T>) {
  usePageTitle(pageTitle);

  // ── Search state ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedValue = useDebounce(searchTerm, searchDebounceMs);
  // When debounce is 0, skip the async debounce and use the raw value directly
  const debouncedSearch = searchDebounceMs === 0 ? searchTerm : debouncedValue;

  // ── Delete state ────────────────────────────────────────────────────────────
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false, id: '', label: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const requestDelete = useCallback((id: string, label: string) => {
    setDeleteState({ open: true, id, label });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfig) return;
    setDeleteLoading(true);
    try {
      await deleteConfig.onConfirm(deleteState.id);
    } finally {
      setDeleteLoading(false);
      setDeleteState({ open: false, id: '', label: '' });
    }
  }, [deleteConfig, deleteState.id]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    if (!filterFn || !debouncedSearch.trim()) return items;
    return items.filter((item) => filterFn(item, debouncedSearch));
  }, [items, filterFn, debouncedSearch]);

  // ── Render context ──────────────────────────────────────────────────────────
  const ctx: RenderContext<T> = {
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    filteredItems,
    requestDelete,
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    if (renderLoading) return <div className={className}>{renderLoading()}</div>;

    const { count = 3, height = 'h-48', gridCols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' } = skeletonConfig ?? {};
    return (
      <div className={className}>
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className={`grid gap-4 ${gridCols}`}>
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className={`${height} w-full rounded-xl`} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={className}>
        <ErrorState
          title={`Erro ao carregar ${pageTitle.toLowerCase()}`}
          message={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  // ── Empty state (data truly empty, not just filtered) ───────────────────────
  if (isEmpty && emptyStateProps) {
    return (
      <div className={className}>
        {renderHeader?.(ctx)}
        <EmptyState
          icon={emptyStateProps.icon}
          title={emptyStateProps.title}
          description={emptyStateProps.description}
          action={emptyStateProps.action}
        />
        {renderExtra?.(ctx)}
      </div>
    );
  }

  // ── Main content ────────────────────────────────────────────────────────────
  const deleteDescription = deleteConfig
    ? typeof deleteConfig.description === 'function'
      ? deleteConfig.description(deleteState.label)
      : deleteConfig.description
    : '';

  const filterAnnouncement = debouncedSearch.trim()
    ? `${filteredItems.length} resultado${filteredItems.length !== 1 ? 's' : ''} encontrado${filteredItems.length !== 1 ? 's' : ''}`
    : '';

  return (
    <div className={className}>
      {filterAnnouncement && <ScreenReaderAnnounce message={filterAnnouncement} />}
      {renderHeader?.(ctx)}

      {/* Search + Filters Row */}
      {(searchPlaceholder || renderFilters) && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          {renderFilters?.(ctx)}
        </div>
      )}

      {/* Items or No Results */}
      {filteredItems.length === 0 ? (
        renderNoResults?.(ctx) ?? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="w-12 h-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-medium">Nenhum resultado encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tente ajustar os filtros de busca.
            </p>
          </div>
        )
      ) : (
        renderItems(filteredItems, ctx)
      )}

      {/* Pagination */}
      {pagination && filteredItems.length > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          hasPrevPage={pagination.hasPrevPage}
          hasNextPage={pagination.hasNextPage}
          onPrev={pagination.onPrev}
          onNext={pagination.onNext}
          label={pagination.label}
        />
      )}

      {renderExtra?.(ctx)}

      {/* Confirm Delete Dialog */}
      {deleteConfig && (
        <ConfirmDialog
          open={deleteState.open}
          onOpenChange={(v) => !deleteLoading && setDeleteState((prev) => ({ ...prev, open: v }))}
          title={deleteConfig.title}
          description={deleteDescription}
          onConfirm={() => { void handleConfirmDelete(); }}
          loading={deleteLoading}
          destructive
        />
      )}
    </div>
  );
}

export default CRUDManagerLayout;
